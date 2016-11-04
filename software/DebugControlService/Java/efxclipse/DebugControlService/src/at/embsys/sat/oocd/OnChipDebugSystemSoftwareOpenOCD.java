/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat.oocd;

import at.embsys.sat.Main;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.application.Platform;
import javafx.scene.control.Alert;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class OnChipDebugSystemSoftwareOpenOCD implements Runnable {
    private final String OS = System.getProperty("os.name").toLowerCase();
    private final TextArea debugConsole;
    private final Circle oocdState;
    private final Label oocdPath;
    private final ComboBox comboBoxHWList;
    private final Alert alert = new Alert(Alert.AlertType.INFORMATION);
    private static Thread redirectToOOCDThread;
    private static RedirectToOOCD redirecttooocd;
    private static Process procOCDSOOCD = null;
    public static boolean rebootRequired = false;
    private int oocdPort = 3333;
    private List<String> deviceInfo = new ArrayList<String>();
    private static boolean end = false;
    private static boolean NewOOCDExecSelected = false;
    private String device = "XMC4500";
    private String processInput;
    private static ch.qos.logback.classic.Logger logger;

    /* Set flag if OpenOCD executable has changed */
    public static void setNewOOCDExecSelected(boolean newOOCDExecSelected) {
        NewOOCDExecSelected = newOOCDExecSelected;
    }

    /* Sets flag to end thread */
    public void setEnd(boolean end) {
        OnChipDebugSystemSoftwareOpenOCD.end = end;
    }

    /* Retrieve the OpenOCD port */
    public int getOocdPort() {
        return oocdPort;
    }

    /* Konstruktor to pass the text area for displaying OOCD output */
    public OnChipDebugSystemSoftwareOpenOCD(TextArea cmdLine, Circle oocd, Label oocdpath, ComboBox comboBoxHW, int oocdport, List<String> deviceinfo, String targetPlatform) {

        debugConsole = cmdLine;
        oocdState = oocd;
        oocdPath = oocdpath;
        comboBoxHWList = comboBoxHW;
        if (oocdport != 0) oocdPort = oocdport;
        deviceInfo = deviceinfo;
        device = targetPlatform;
    }

    @Override
    public void run() {

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(OnChipDebugSystemSoftwareOpenOCD.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);

        while (!end) {
            try {
                logger.debug("Start OpenOCD");
                /* Check OS and run OpenOCD*/
                if ((OS.contains("linux") || OS.contains("mac"))) {
                    //procOCDSJlink = Runtime.getRuntime().exec("JLinkGDBServer -Device XMC4500-1024 -if SWD");
                    if (deviceInfo.size() > 1 && !deviceInfo.get(1).equals("universal") && device.equals("XMC4500"))
                        procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(), "-f", "/usr/local/share/openocd/scripts/board/xmc4500-relax.cfg", "-c", "jlink serial " + deviceInfo.get(1) + ";gdb_port " + oocdPort});
                    else if (deviceInfo.size() > 1 && !deviceInfo.get(1).equals("universal") && device.equals("TM4C1294XL"))
                        procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(), "-f", "/usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg", "-c", "hla_serial " + deviceInfo.get(1) + ";gdb_port " + oocdPort});
                    else {
                        //procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(),"-f","/usr/local/share/openocd/scripts/board/xmc4500-relax.cfg","-c","jlink serial "+comboBoxHWList.getSelectionModel().getSelectedItem()});
                        procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(), "-f", "/usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg", "-c", "hla_serial " + comboBoxHWList.getSelectionModel().getSelectedItem()});
                    }
                } else if (OS.contains("windows")) {
                    if (deviceInfo.size() > 1 && !deviceInfo.get(1).equals("universal") && device.equals("XMC4500"))
                        procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(), "-f", "/usr/local/share/openocd/scripts/board/xmc4500-relax.cfg", "-c", "jlink serial " + deviceInfo.get(1) + ";gdb_port " + oocdPort});
                    else if (deviceInfo.size() > 1 && !deviceInfo.get(1).equals("universal") && device.equals("TM4C1294XL"))
                        procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(), "-f", "/usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg", "-c", "hla_serial " + deviceInfo.get(1) + ";gdb_port " + oocdPort});
                    else {
                        //procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(),"-f","/usr/local/share/openocd/scripts/board/xmc4500-relax.cfg","-c","jlink serial "+comboBoxHWList.getSelectionModel().getSelectedItem()});
                        procOCDSOOCD = Runtime.getRuntime().exec(new String[]{oocdPath.getText(), "-f", "/usr/local/share/openocd/scripts/board/ek-tm4c1294xl.cfg", "-c", "hla_serial " + comboBoxHWList.getSelectionModel().getSelectedItem()});
                    }
                    //procOCDSeStick2 = Runtime.getRuntime().exec( "C:\\eStick2\\openocd\\bin\\openocd.exe -f scripts\\board\\estick2.cfg" );
                } else {
                    logger.error("Operating system not supported for OpenOCD");
                }

                /* Create Buffered reader for OCDS process */
                //BufferedReader stdInputOOCD = new BufferedReader(new
                //        InputStreamReader(procOCDSOOCD.getInputStream()));

                BufferedReader stdErrorOOCD = new BufferedReader(new
                        InputStreamReader(procOCDSOOCD.getErrorStream()));

                /* Create log directory */
                File logFile = new File(System.getProperty("user.home") + "/.debugcontrolservice");
                if (!logFile.exists()) {
                    if (!logFile.mkdirs()) logger.warn("Could not create log directory for OpenOCD");
                }

                OutputStream logOOCDStream = new FileOutputStream(System.getProperty("user.home") + "/.debugcontrolservice/openocd.log");
                Calendar cal;

               /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                        oocdState.setFill(Color.RED);
                    }
                });
                /* read any errors from the attempted command */
                while ((processInput = stdErrorOOCD.readLine()) != null) {
                    cal = Calendar.getInstance();
                    logOOCDStream.write((cal.get(Calendar.DAY_OF_MONTH) +
                            "." + (cal.get(Calendar.MONTH) + 1) +
                            "." + cal.get(Calendar.YEAR) + "-" + cal.get(Calendar.HOUR_OF_DAY) + ":" +
                            cal.get(Calendar.MINUTE) + ":" +
                            cal.get(Calendar.SECOND) + " " + processInput + "\n").getBytes());
                    if (processInput.contains("tm4c1294ncpdt.cpu: hardware has 6 breakpoints, 4 watchpoints") || processInput.contains("xmc4500.cpu: hardware has 6 breakpoints, 4 watchpoints")) {

                          /* Start the TCP/IP JLink connection Thread*/
                        redirecttooocd = new RedirectToOOCD(oocdState, device, this);
                        redirectToOOCDThread = new Thread(redirecttooocd);
                        redirectToOOCDThread.start();

                    }
                    /* When target gets disconnected */
                    if (processInput.contains("Examination failed, GDB will be halted. Polling again in")) {
                        rebootRequired = true;
                        /* Quit GDB */
                        WebSocketConnectionHandler.ws_sendMsg("reset-gdb");
                        /* Send message to display in the browser */
                        WebSocketConnectionHandler.ws_sendMsg("restart-required");
                        /* Sent flag that TM4C1294XL is offline */
                        WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-offline");

                        /* Kill OOCD when nod GDB session is active, e.g., flashing, debugging */
                        if (WebSocketConnectionHandler.getModeOfOperation().equals("")) {
                            stopOOCDRedirectService();
                            procOCDSOOCD.destroy();
                        }
                    }
                    if (processInput.contains("Memory write failure!")) {
                        rebootRequired = true;

                        WebSocketConnectionHandler.ws_sendMsg("reset-gdb");
                        WebSocketConnectionHandler.ws_sendMsg("restart-required");
                        WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-offline");
                    }

                    if (processInput.contains("Info : accepting 'gdb' connection on tcp/") && rebootRequired)
                        rebootRequired = false;

                    /* UI updaten */
                    Platform.runLater(new Runnable() {
                        @Override
                        public void run() {
                            String tmp = debugConsole.getText() + ("Errors: " + processInput + "\n");
                            if (tmp.length() > 1000) tmp = tmp.substring(tmp.length() - 1000, tmp.length());

                            debugConsole.setText(tmp);
                            debugConsole.positionCaret(tmp.length() - 1);
                        }
                    });
                    logger.debug("OpenOCD: " + processInput);

                    /* Sleep 100ms to do not flood the UI */
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException e) {
                        logger.debug("An InterruptedException was thrown @ Thread.sleep()", e);
                    }

                }
                /* Close stream used or logging JLink GDB server */
                logOOCDStream.close();

            } catch (IOException e) {
                /* If the path to the executable was invalid */
                if (e.toString().contains("Cannot run program")) {
                    logger.error("The path to the OpenOCD executable is not valid");

                    if (!oocdPath.getTextFill().equals(Color.RED) && NewOOCDExecSelected) {

                        Platform.runLater(new Runnable() {
                            @Override
                            public void run() {
                                oocdPath.setTextFill(Color.RED);
                                if (!alert.isShowing()) {
                                    alert.setTitle("No OOCD Executable");
                                    alert.setHeaderText(null);
                                    alert.setContentText("The path to the OOCD executable is wrong! Please specify the right path to OpenOCD.");
                                    alert.showAndWait();
                                }

                            }
                        });
                        setNewOOCDExecSelected(false);
                    }

                }
                logger.debug("An IOException was thrown", e);
            }
            /* Wait for process to exit */
            if (procOCDSOOCD != null) {
                try {
                    if (procOCDSOOCD.waitFor(2, TimeUnit.SECONDS)) {
                        logger.debug("OpenOCD exited with code " + procOCDSOOCD.exitValue());
                    } else {
                        logger.debug("OpenOCD did not exit within 2 seconds");
                    }
                } catch (InterruptedException e) {
                    logger.debug("An InterruptedException was thrown @ waitFor()", e);
                }
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                logger.debug("An InterruptedException was thrown @ Thread.sleep()", e);
            }
        }
        logger.debug("Exit OnChipDebugSystemSoftwareOpenOCD Thread");
    }

    /* Retrieve OpenOCD process */
    public static Process getOCDSProcess() {
        return procOCDSOOCD;
    }

    /* Restart redirection service (proxy) */
    public static void restartOOCDRedirectService() {

        try {
            if (redirecttooocd != null) redirecttooocd.getOutToOOCDGDB().close();
        } catch (IOException e) {
            logger.debug("An IOException was thrown @ getOutToOOCDGDB().close()", e);
        }
        if (redirectToOOCDThread != null) {
            while (redirectToOOCDThread.isAlive()) {
                if (end) return;
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    logger.debug("An InterruptedException was thrown @ Thread.sleep()", e);
                }

            }
        }
        redirectToOOCDThread = new Thread(redirecttooocd);
        redirectToOOCDThread.start();

    }

    /* Stop redirection service (proxy) */
    public static void stopOOCDRedirectService() {

        try {
            if (redirecttooocd != null) redirecttooocd.getOutToOOCDGDB().close();
        } catch (IOException e) {
            logger.debug("An IOException was thrown @ getOutToOOCDGDB().close()", e);
        }
    }
}