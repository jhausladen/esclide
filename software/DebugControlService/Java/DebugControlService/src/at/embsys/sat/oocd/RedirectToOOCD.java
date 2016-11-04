/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat.oocd;

import at.embsys.sat.Main;
import at.embsys.sat.RemoteGDBConnector;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.application.Platform;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.net.Socket;

public class RedirectToOOCD implements Runnable {

    private final Circle oocdStateCircle;
    private final String device;
    private static boolean launchpad_connected = false;
    private static OutputStream outToServer;
    private OutputStream outToOOCDGDB;
    private int timeoutCount = 1;
    private int retries = 5;
    private final int timeoutms = 1000;
    private int retriestmp, timeoutCountTmp;
    private final OnChipDebugSystemSoftwareOpenOCD onChipDebugSystemSoftware;
    private ch.qos.logback.classic.Logger logger;

    /* Return connected launchpad/TM4C1294XL status */
    public static boolean isLaunchpad_connected() {
        return launchpad_connected;
    }

    /* Returns socket used to pipe raw GDB data from the server to OpenOCD (TCP) */
    public OutputStream getOutToOOCDGDB() {
        return outToOOCDGDB;
    }

    public RedirectToOOCD(Circle oocdState, String device, OnChipDebugSystemSoftwareOpenOCD ocdss) {
        oocdStateCircle = oocdState;
        this.device = device;
        onChipDebugSystemSoftware = ocdss;
    }

    /* Sets the outputstream for the redirect thread to forward raw OpenOCD data to the server GDB (TCP) */
    public static void setOutToServer(OutputStream outToServer) {
        RedirectToOOCD.outToServer = outToServer;
    }

    @Override
    public void run() {

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(RedirectToOOCD.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);

        retriestmp = retries;
        timeoutCountTmp = timeoutCount;
        while (timeoutCount <= retries) {
            timeoutCount++;
            InputStream in = null;
            Socket socket = null;

            try {

                /* Connect to OpenOCD */
                String server = "127.0.0.1";
                socket = new Socket(server, onChipDebugSystemSoftware.getOocdPort());

                logger.debug("Connected to OpenOCD");
                retries = 0;
                in = socket.getInputStream();

                /* Write out a "+" sign so that OpenOCD won't exit */
                outToOOCDGDB =
                        socket.getOutputStream();

                outToOOCDGDB.write("+".getBytes());

                outToOOCDGDB.flush();

                /* Pass outputstream to OpenOCD to RemoteGDBConnector (proxy) */
                RemoteGDBConnector.setOutToOOCD(outToOOCDGDB);

                /* Initialized with 0 */
                int anzahlZeichen;
                byte[] buffer = new byte[200];

                logger.debug("Wait@RedirectToOOCD");

                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        oocdStateCircle.setFill(Color.GREEN);
                    }
                });

                /* Notify web interface */
                if (device.equals("XMC4500")) WebSocketConnectionHandler.ws_sendMsg("xmc4500-online");
                else WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-online");
                launchpad_connected = true;
                WebSocketConnectionHandler.ws_sendMsg("DBGControlServiceOOCD-ready");
                while ((anzahlZeichen = in.read(buffer)) >= 0) {

                    /* Write raw data to server GDB (TCP) */
                    if (outToServer != null) {
                        outToServer.write(buffer, 0, anzahlZeichen);
                        outToServer.flush();
                    }

                }

                /* Clean up! */
                RemoteGDBConnector.setOutToOOCD(null);

                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        oocdStateCircle.setFill(Color.RED);
                    }
                });
                WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-offline");
                launchpad_connected = false;
                logger.debug("OpenOCD server closed ");


            } catch (IOException e) {
                logger.debug("An IOException was thrown", e);
                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        oocdStateCircle.setFill(Color.RED);
                    }
                });
                RemoteGDBConnector.setOutToOOCD(null);
                WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-offline");
                launchpad_connected = false;

            } finally {
                if (socket != null) try {
                    socket.close();
                    logger.debug("Socket to OpenOCD closed...");
                } catch (IOException e) {
                    logger.debug("Socket to OpenOCD still open...");
                    logger.debug("'IOException @ socket.close()", e);
                }
                if (in != null)
                    try {
                        in.close();
                        logger.debug("Closed InputStream on OpenOCD socket...");
                    } catch (IOException e) {
                        logger.debug("InputStream on OpenOCD socket still open...");
                        logger.debug("IOException @ in.close()", e);
                    }
            }
            logger.debug("Could not connect to OOCD! Retry in " + timeoutms + "ms. Count: " + (timeoutCount - 1) + ":" + retries);
            try {
                Thread.sleep(timeoutms);
            } catch (InterruptedException e) {
                logger.debug("An IOException was thrown @ Thread.sleep()", e);
            }
        }
        retries = retriestmp;
        timeoutCount = timeoutCountTmp;
        logger.debug("Exit RedirectToOOCD Thread");

    }
}
