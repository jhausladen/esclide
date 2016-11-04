package at.embsys.sat.oocd;

import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.application.Platform;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import org.controlsfx.control.action.Action;
import org.controlsfx.dialog.Dialog;
import org.controlsfx.dialog.Dialogs;

import java.io.*;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class OnChipDebugSystemSoftwareOpenOCD implements Runnable {
    private final String OS = System.getProperty("os.name").toLowerCase();
    private static Process procOCDSOOCD = null;
    private final TextArea debugConsole;
    private String processInput;
    private final Circle oocdState;
    private boolean end = false;
    private static Thread redirectToOOCDThread;
    private static RedirectToOOCD redirecttooocd;
    private boolean rebootRequired = false;
    private final Label oocdPath;
    private final ComboBox comboBoxHWList;
    private static int oocdPort = 3333;
    private static List<String> deviceInfo = new ArrayList<String>();


    public void setEnd(boolean end) {
        this.end = end;
    }

    public static int getOocdPort() {
        return oocdPort;
    }

    /* Konstruktor to pass the text area for displaying OOCD output */
    public OnChipDebugSystemSoftwareOpenOCD(TextArea cmdLine, Circle oocd, Label oocdpath, ComboBox comboBoxHW, int oocdport, List<String> deviceinfo) {

        debugConsole = cmdLine;
        oocdState = oocd;
        oocdPath = oocdpath;
        comboBoxHWList = comboBoxHW;
        if(oocdport!=0)oocdPort = oocdport;
        deviceInfo = deviceinfo;
    }

    @Override
    public void run() {

        while (!end) {
            try {

                /* Check OS */
                if ((OS.contains("linux") || OS.contains("mac"))) {
                    //procOCDSJlink = Runtime.getRuntime().exec("JLinkGDBServer -Device XMC4500-1024 -if SWD");
                    if(deviceInfo.size() > 1 && !deviceInfo.get(1).equals("default")) procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(),"-f","/usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg","-c","hla_serial "+deviceInfo.get(1)+";gdb_port "+oocdPort});
                    else procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(),"-f","/usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg","-c","hla_serial "+comboBoxHWList.getSelectionModel().getSelectedItem()});
                } else if (OS.contains("windows")) {
                    procOCDSOOCD = Runtime.getRuntime().exec(oocdPath.getText() + " -f /usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg");
                    //procOCDSeStick2 = Runtime.getRuntime().exec( "C:\\eStick2\\openocd\\bin\\openocd.exe -f scripts\\board\\estick2.cfg" );
                } else {
                    System.out.println("Operating System not supported!");
                }




                /* Create Buffered reader for OCDS process */
                BufferedReader stdInputOOCD = new BufferedReader(new
                        InputStreamReader(procOCDSOOCD.getInputStream()));

                BufferedReader stdErrorOOCD = new BufferedReader(new
                        InputStreamReader(procOCDSOOCD.getErrorStream()));

                /* Create log directory */
                File logFile = new File(System.getProperty("user.home") + "/.debugcontrolservice");
                if(!logFile.exists())logFile.mkdirs();

                OutputStream logOOCDStream = new FileOutputStream(System.getProperty("user.home") + "/.debugcontrolservice/openocd.log");
                Calendar cal;
               /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                            /* entsprechende UI Komponente updaten */
                        oocdState.setFill(Color.RED);
                    }
                });
            /* read any errors from the attempted command */
                System.out.println("Here is the standard error of the command (if any):\n");
                System.out.println("OpenOCD UP!");
                while ((processInput = stdErrorOOCD.readLine()) != null) {
                    cal = Calendar.getInstance ();
                    logOOCDStream.write((cal.get(Calendar.DAY_OF_MONTH) +
                            "." + (cal.get(Calendar.MONTH) + 1) +
                            "." + cal.get(Calendar.YEAR) + "-" + cal.get(Calendar.HOUR_OF_DAY) + ":" +
                            cal.get(Calendar.MINUTE) + ":" +
                            cal.get(Calendar.SECOND) + " "+processInput + "\n").getBytes());
                    if (processInput.contains("tm4c1294ncpdt.cpu: hardware has 6 breakpoints, 4 watchpoints")) {

                          /* Start the TCP/IP JLink connection Thread*/
                        redirecttooocd = new RedirectToOOCD(oocdState);
                        redirectToOOCDThread = new Thread(redirecttooocd);
                        redirectToOOCDThread.start();

                    }

                    if (processInput.contains("WARNING: Failed to read memory")) {
                        rebootRequired = true;
                        WebSocketConnectionHandler.ws_sendMsg("reset-gdb");
                    }

                    if (processInput.contains("Info : dropped 'gdb' connection") && rebootRequired) {
                        System.out.println("Destroy and restart JLink! ");
                        ///Thread.sleep(3000);
                        procOCDSOOCD.destroy();
                        WebSocketConnectionHandler.ws_sendMsg("restart-required");
                    }
                    if (processInput.contains("Connected to") && !processInput.contains("Connected to target") && rebootRequired) {
                        if (WebSocketConnectionHandler.getModeOfOperation().equals("flash"))
                            WebSocketConnectionHandler.ws_sendMsg("flash");
                        if (WebSocketConnectionHandler.getModeOfOperation().equals("debug"))
                            WebSocketConnectionHandler.ws_sendMsg("debug");
                        rebootRequired = false;
                    }



                /* UI updaten */
                    Platform.runLater(new Runnable() {
                        @Override
                        public void run() {
                        /* entsprechende UI Komponente updaten */
                            if (processInput != null) debugConsole.appendText("Errors: " + processInput + "\n");
                        }
                    });


                }
                logOOCDStream.close();
                ///Thread.sleep(3000);
            } catch (IOException e) {
                e.printStackTrace();

                if (e.toString().contains("Cannot run program")) {
                    System.out.println("IOException: " + e.toString());

                    if (!oocdPath.getTextFill().equals(Color.RED)) {


                        Platform.runLater(new Runnable() {
                            @Override
                            public void run() {
                                oocdPath.setTextFill(Color.RED);
                                Action response = Dialogs.create()
                                        .owner(oocdPath.getScene().getRoot())
                                        .title("No JLink Executable")
                                        .message("The path to the JLink executable is wrong! Please specify the right path to JLink GDB server.")
                                        .actions(Dialog.Actions.CLOSE)
                                        .showError();

                            }
                        });
                    }


                }
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

    }

    public static Process getOCDSProcess() {
        return procOCDSOOCD;
    }

    public static void restartOOCDRedirectService() {

        try {
            if(redirecttooocd != null)redirecttooocd.getOutToOOCDGDB().close();
        } catch (IOException e) {
            e.printStackTrace();
        }
        redirectToOOCDThread = new Thread(redirecttooocd);
        redirectToOOCDThread.start();

    }


}