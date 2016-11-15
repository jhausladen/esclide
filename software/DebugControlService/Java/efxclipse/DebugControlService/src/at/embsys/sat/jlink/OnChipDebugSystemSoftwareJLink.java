/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat.jlink;

import at.embsys.sat.Main;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.application.Platform;
import javafx.scene.control.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class OnChipDebugSystemSoftwareJLink implements Runnable {
    private final String OS = System.getProperty("os.name").toLowerCase();
    private final TextArea debugConsole;
    private final Circle jlinkState;
    private final Label jlinkPath;
    private final ComboBox comboBoxHWList;
    private final Alert alert = new Alert(Alert.AlertType.INFORMATION);
    private static Process procOCDSJlink = null;
    private static Thread redirectToJlinkThread;
    private static RedirectToJLink redirecttojlink;
    private int jLinkPort = 2331;
    private List<String> deviceInfo = new ArrayList<String>();
    private static boolean end = false;
    public static boolean rebootRequired = false;
    private static boolean NewJLinkExecSelected = false;
    private static ch.qos.logback.classic.Logger logger;
    private String processInput;
    private boolean readRegistersFailed = false;

    /* Set flag if JLink GDB server executable has changed */
    public static void setNewJLinkExecSelected(boolean newJLinkExecSelected) {
        NewJLinkExecSelected = newJLinkExecSelected;
    }

    /* Sets flag to end thread */
    public void setEnd(boolean end) {
        OnChipDebugSystemSoftwareJLink.end = end;
    }

    /* Retrieve the JLink GDB server port */
    public int getjLinkPort() {
        return jLinkPort;
    }

    /* Konstruktor to pass the text area for displaying OOCD output */
    public OnChipDebugSystemSoftwareJLink(TextArea cmdLine, Circle jlink, Label jlkpath, ComboBox comboBoxHW, int jlinkport, List<String> deviceinfo) {

        debugConsole = cmdLine;
        jlinkState = jlink;
        jlinkPath = jlkpath;
        comboBoxHWList = comboBoxHW;
        if (jlinkport != 0) jLinkPort = jlinkport;
        deviceInfo = deviceinfo;

    }

    @Override
    public void run() {

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(OnChipDebugSystemSoftwareJLink.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);

        while (!end) {
            try {
                logger.debug("Start JLink GDB server");
                /* Check OS and run JLink GDB server */
                if ((OS.contains("linux") || OS.contains("mac"))) {
                    if (deviceInfo.size() > 1 && !deviceInfo.get(1).equals("universal"))
                        procOCDSJlink = Runtime.getRuntime().exec(jlinkPath.getText() + " -select usb=" + deviceInfo.get(1) + " -Device XMC4500-1024 -if SWD" + " -port " + jLinkPort);
                    else
                        procOCDSJlink = Runtime.getRuntime().exec(jlinkPath.getText() + " -select usb=" + comboBoxHWList.getSelectionModel().getSelectedItem() + " -Device XMC4500-1024 -if SWD -port " + jLinkPort);
                } else if (OS.contains("windows")) {
                    //procOCDSJlink = Runtime.getRuntime().exec(jlinkPath.getText() + " -Device XMC4500-1024 -if SWD");
                    //procOCDSeStick2 = Runtime.getRuntime().exec( "C:\\eStick2\\openocd\\bin\\openocd.exe -f scripts\\board\\estick2.cfg" );
                    if (deviceInfo.size() > 1 && !deviceInfo.get(1).equals("universal"))
                        procOCDSJlink = Runtime.getRuntime().exec(jlinkPath.getText() + " -select usb=" + deviceInfo.get(1) + " -Device XMC4500-1024 -if SWD" + " -port " + jLinkPort);
                    else
                        procOCDSJlink = Runtime.getRuntime().exec(jlinkPath.getText() + " -select usb=" + comboBoxHWList.getSelectionModel().getSelectedItem() + " -Device XMC4500-1024 -if SWD" + " -port " + jLinkPort);
                } else {
                    logger.error("Operating system not supported for JLink GDB server");
                }

                /* Create Buffered reader for OCDS process */
                BufferedReader stdInputJLink = new BufferedReader(new
                        InputStreamReader(procOCDSJlink.getInputStream()));

                BufferedReader stdErrorJLink = new BufferedReader(new
                        InputStreamReader(procOCDSJlink.getErrorStream()));

                 /* Create log directory */
                File logFile = new File(System.getProperty("user.home") + "/.debugcontrolservice");
                if (!logFile.exists()) {
                    if (!logFile.mkdirs()) logger.warn("Could not create log directory for JLink GDB server");
                }

                OutputStream logJlinkStream = new FileOutputStream(System.getProperty("user.home") + "/.debugcontrolservice/jlink.log");
                Calendar cal;

                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                        jlinkState.setFill(Color.RED);
                    }
                });

                /* read the output from the command */
                while ((processInput = stdInputJLink.readLine()) != null) {
                    logger.debug("JLink(1): " + processInput);

                    cal = Calendar.getInstance();
                    logJlinkStream.write((cal.get(Calendar.DAY_OF_MONTH) +
                            "." + (cal.get(Calendar.MONTH) + 1) +
                            "." + cal.get(Calendar.YEAR) + "-" + cal.get(Calendar.HOUR_OF_DAY) + ":" +
                            cal.get(Calendar.MINUTE) + ":" +
                            cal.get(Calendar.SECOND) + " " + processInput + "\n").getBytes());

                    /* If we are connected to a development board, start the proxy thread to connect
                     * to JLink GDB server */
                    if (processInput.contains("Connected to target")) {

                        /* Start the TCP/IP JLink connection Thread*/
                        redirecttojlink = new RedirectToJLink(jlinkState, this, jlinkPath);
                        redirectToJlinkThread = new Thread(redirecttojlink);
                        redirectToJlinkThread.start();

                    }
                    /* Reset connections if we encounter an error */
                    if (processInput.contains("WARNING: Failed to read memory")) {
                        rebootRequired = true;
                        /* Quit GDB */
                        WebSocketConnectionHandler.ws_sendMsg("reset-gdb");
                        /* Send message to display in the browser */
                        WebSocketConnectionHandler.ws_sendMsg("restart-required");
                        /* Sent flag that XMC4500 is offline */
                        WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
                    }
                    /* If the connection to the development board is lost, reset connections */
                    if (processInput.contains("WARNING: Target connection lost.")) {
                        rebootRequired = true;
                        WebSocketConnectionHandler.ws_sendMsg("reset-gdb");
                        WebSocketConnectionHandler.ws_sendMsg("restart-required");
                        WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");

                        /* Kill JLink if no GDB session is active, e.g., flashing or debugging */
                        if (WebSocketConnectionHandler.getModeOfOperation().equals("")) {
                            stopJLinkRedirectService();
                            procOCDSJlink.destroy();
                        }

                    }
                    /* Reset reboot flag */
                    if (processInput.contains("Connected to") && !processInput.contains("Connected to target") && rebootRequired)
                        rebootRequired = false;
                    if (processInput.matches(".*ERROR: Can not read register.*while CPU is running")) {
                        readRegistersFailed = true;
                    } else {
                        if (readRegistersFailed) {
                            processInput = "WARNING: Some registers can not be read while CPU is running\n" + processInput;
                            readRegistersFailed = false;
                        }
                        /* UI updaten */
                        Platform.runLater(new Runnable() {
                            @Override
                            public void run() {
                                String tmp = debugConsole.getText() + (processInput + "\n");
                                if (tmp.length() > 1000) tmp = tmp.substring(tmp.length() - 1000, tmp.length());

                                debugConsole.setText(tmp);
                                debugConsole.positionCaret(tmp.length() - 1);
                            }
                        });

                        /* Sleep 100ms to do not flood the UI */
                        try {
                            Thread.sleep(100);
                        } catch (InterruptedException e) {
                            logger.debug("An InterruptedException was thrown @ Thread.sleep()", e);
                        }
                    }
                }
               /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                        jlinkState.setFill(Color.RED);
                    }
                });
               /* read any errors from the attempted command */
                while ((processInput = stdErrorJLink.readLine()) != null) {
                    logger.debug("JLink(2): " + processInput);
                    /* UI updaten */
                    Platform.runLater(new Runnable() {
                        @Override
                        public void run() {
                            String tmp = debugConsole.getText() + (processInput + "\n");
                            if (tmp.length() > 1000) tmp = tmp.substring(tmp.length() - 1000, tmp.length());

                            debugConsole.setText(tmp);
                            debugConsole.positionCaret(tmp.length() - 1);
                        }
                    });
                    /* Sleep 100ms to do not flood the UI */
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException e) {
                        logger.debug("An InterruptedException was thrown @ Thread.sleep()", e);
                    }

                }
                /* Close stream used or logging JLink GDB server */
                logJlinkStream.close();

            } catch (IOException e) {
                /* If the path to the executable was invalid */
                if (e.toString().contains("Cannot run program")) {
                    logger.error("The path to the JLink GDB server executable is not valid");

                    if (!jlinkPath.getTextFill().equals(Color.RED) && NewJLinkExecSelected) {

                        Platform.runLater(new Runnable() {
                            @Override
                            public void run() {
                                jlinkPath.setTextFill(Color.RED);
                                if (!alert.isShowing()) {

                                    alert.setTitle("No JLink Executable");
                                    alert.setHeaderText(null);
                                    alert.setContentText("The path to the JLink executable is wrong! Please specify the right path to JLink GDB server.");
                                    alert.showAndWait();

                                }
                            }
                        });
                        setNewJLinkExecSelected(false);
                    }
                }
                logger.debug("An IOException was thrown", e);
            }
            /* Wait for process to exit */
            if (procOCDSJlink != null) {
                try {
                    if (procOCDSJlink.waitFor(2, TimeUnit.SECONDS)) {
                        logger.debug("JLink GDB server exited with code " + procOCDSJlink.exitValue());
                    } else {
                        logger.debug("JLink GDB server did not exit within 2 seconds");
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
        logger.debug("Exit OnChipDebugSystemSoftwareJLink Thread");
    }

    /* Retrieve JLink GDB server process */
    public static Process getOCDSProcess() {
        return procOCDSJlink;
    }

    /* Restart redirection service (proxy) */
    public static void restartJLinkRedirectService() {

        try {
            if (redirecttojlink != null) redirecttojlink.getOutToJLinkGDB().close();
        } catch (IOException e) {
            logger.debug("An IOException was thrown @ getOutToJLinkGDB().close()", e);
        }
        if (redirectToJlinkThread != null) {
            while (redirectToJlinkThread.isAlive()) {
                if (end) return;
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    logger.debug("An InterruptedException was thrown @ Thread.sleep()", e);
                }

            }
        }
        redirectToJlinkThread = new Thread(redirecttojlink);
        redirectToJlinkThread.start();
    }

    /* Stop redirection service (proxy) */
    public static void stopJLinkRedirectService() {

        try {
            if (redirecttojlink != null) redirecttojlink.getOutToJLinkGDB().close();
        } catch (IOException e) {
            logger.debug("An IOException was thrown @ getOutToJLinkGDB().close()", e);
        }
    }


}