/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat.jlink;

import at.embsys.sat.Main;
import at.embsys.sat.RemoteGDBConnector;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.application.Platform;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.net.Socket;

public class RedirectToJLink implements Runnable {

    private final Circle xmc4500StateCircle;
    private static boolean xmc4500_connected = false;
    private static OutputStream outToServer;
    private OutputStream outToJLinkGDB;
    private int timeoutCount = 1;
    private int retries = 5;
    private final int timeoutms = 1000;
    private int retriestmp, timeoutCountTmp;
    private final OnChipDebugSystemSoftwareJLink onChipDebugSystemSoftwareJLink;
    private ch.qos.logback.classic.Logger logger;

    /* Return XMC4500 status */
    public static boolean isXmc4500_connected() {
        return xmc4500_connected;
    }

    /* Returns socket used to pipe raw GDB data from the server to JLink GDB server (TCP) */
    public OutputStream getOutToJLinkGDB() {
        return outToJLinkGDB;
    }

    public RedirectToJLink(Circle jlinkState, OnChipDebugSystemSoftwareJLink ocdssj) {

        xmc4500StateCircle = jlinkState;
        onChipDebugSystemSoftwareJLink = ocdssj;

    }

    /* Sets the outputstream for the redirect thread to forward raw JLink data to the server GDB (TCP) */
    public static void setOutToServer(OutputStream outToServer) {
        RedirectToJLink.outToServer = outToServer;
    }

    @Override
    public void run() {

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(RedirectToJLink.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);

        retriestmp = retries;
        timeoutCountTmp = timeoutCount;
        while (timeoutCount <= retries) {
            timeoutCount++;
            InputStream in = null;
            Socket socket = null;

            try {

                /* Connect to JLink GDB server */
                String server = "127.0.0.1";
                socket = new Socket(server, onChipDebugSystemSoftwareJLink.getjLinkPort());
                logger.debug("Connected to JLink GDB server");
                retries = 0;

                in = socket.getInputStream();
                outToJLinkGDB =
                        socket.getOutputStream();

                /* Pass outputstream to JLink GDB server to RemoteGDBConnector (proxy) */
                RemoteGDBConnector.setOutToJLink(outToJLinkGDB);

                /* Initialized with 0 */
                int anzahlZeichen;
                byte[] buffer = new byte[200];

                logger.debug("Wait@RedirectToJLink");

                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        xmc4500StateCircle.setFill(Color.GREEN);
                    }
                });
                /* Notify web interface */
                WebSocketConnectionHandler.ws_sendMsg("xmc4500-online");
                xmc4500_connected = true;
                WebSocketConnectionHandler.ws_sendMsg("DBGControlServiceJLink-ready");
                while ((anzahlZeichen = in.read(buffer)) >= 0) {

                    /* Write raw data to server GDB (TCP) */
                    if (outToServer != null) {
                        outToServer.write(buffer, 0, anzahlZeichen);
                        outToServer.flush();
                    }

                }

                /* Clean up! */
                RemoteGDBConnector.setOutToJLink(null);

                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        xmc4500StateCircle.setFill(Color.RED);
                    }
                });

                WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
                xmc4500_connected = false;
                logger.debug("JLink GDB server closed ");


            } catch (IOException e) {
                logger.debug("'An IOException was thrown", e);
                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        xmc4500StateCircle.setFill(Color.RED);
                    }
                });
                RemoteGDBConnector.setOutToJLink(null);
                WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
                xmc4500_connected = false;

            } finally {
                if (socket != null) try {
                    socket.close();
                    logger.debug("Socket to JLink GDB server closed...");
                } catch (IOException e) {
                    logger.debug("Socket to JLink GDB server still open...");
                    logger.debug("'IOException @ socket.close()", e);
                }
                if (in != null)
                    try {
                        in.close();
                        logger.debug("Closed InputStream on JLink socket...");
                    } catch (IOException e) {
                        logger.debug("InputStream on JLink socket still open...");
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
        logger.debug("Exit RedirectToJlink Thread");

    }
}
