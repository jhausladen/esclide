/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat;

import at.embsys.sat.jlink.RedirectToJLink;
import at.embsys.sat.oocd.RedirectToOOCD;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import at.embsys.sat.websocket.WebSocketServer;
import javafx.application.Platform;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.net.ConnectException;
import java.net.Socket;

public class RemoteGDBConnector implements Runnable {

    private String server = "127.0.0.1";
    private OutputStream outToServer;
    private final Circle serverStateCircle;
    private final WebSocketServer websocketServer;
    private final int startOOCD;
    private final String targetPlatform;
    private boolean end = false;

    private static Socket socket;
    private static OutputStream outToJLink = null;
    private static OutputStream outToOOCD = null;

    private static ch.qos.logback.classic.Logger logger;

    public RemoteGDBConnector(Circle crc, WebSocketServer wsserver, int startOOCD, String targetPlatform) {
        serverStateCircle = crc;
        websocketServer = wsserver;
        this.startOOCD = startOOCD;
        this.targetPlatform = targetPlatform;
    }

    /* Close the socket connected to the server */
    public static void closeSocket() {
        try {
            if (socket != null) socket.close();
            logger.debug("Socket to server closed...");
        } catch (IOException e) {
            logger.debug("Socket to server still open...");
            logger.debug("IOException @ socket.close()", e);
        }
    }

    /* Helper function that lets the RedirectToOOCD thread update the outputstream */
    public static void setOutToOOCD(OutputStream outToOOCD) {
        RemoteGDBConnector.outToOOCD = outToOOCD;
    }

    /* Helper function that lets the RedirectToJLink thread update the outputstream */
    public static void setOutToJLink(OutputStream outToJLink) {
        RemoteGDBConnector.outToJLink = outToJLink;
    }

    /* Set flag to end the thread */
    public void setEnd(boolean end) {
        this.end = end;
    }

    /* Get the server socket */
    public Socket getSocket() {
        return socket;
    }

    @Override
    public void run() {

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(RemoteGDBConnector.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);

        while (!end) {
            /* Create socket that is connected to server on specified port */
            InputStream in = null;
            try {

                /* Connect to server */
                if (Main.deviceInfo.get(1).contains("universal")) server = websocketServer.getIp();
                int port = websocketServer.getDebugport();
                socket = new Socket(server, port);
                logger.info("Connected to server...");

                /* Update UI */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                        serverStateCircle.setFill(Color.GREEN);
                    }
                });

                in = socket.getInputStream();

                outToServer = socket.getOutputStream();

                /* Share the outputstream to the GDB with the RedirectToJLink thread */
                RedirectToJLink.setOutToServer(outToServer);

                /* Share the outputstream to the GDB with the RedirectToJLink thread */
                RedirectToOOCD.setOutToServer(outToServer);

                /* Initialized with 0 */
                int anzahlZeichen;

                byte[] buffer = new byte[200];

                logger.debug("Wait@RemoteGDBConnector");
                while ((anzahlZeichen = in.read(buffer)) >= 0) {

                    /* Write anything received from the server (GDB) to OpenOCD/JLink GDB server
                     * First "if" statement may be used if the XMC4500 is used with OpenjOCD instead of
                     * JLink GDB server */
                    if (targetPlatform.matches("XMC4500") && startOOCD == 1 && outToOOCD != null) {

                        outToOOCD.write(buffer, 0, anzahlZeichen);
                        outToOOCD.flush();

                    } else {

                        if (websocketServer.getDebugHardware().matches("XMC4500") && outToJLink != null) {

                            outToJLink.write(buffer, 0, anzahlZeichen);
                            outToJLink.flush();

                        }
                        if (websocketServer.getDebugHardware().matches("TM4C1294XL") && outToOOCD != null) {

                            outToOOCD.write(buffer, 0, anzahlZeichen);
                            outToOOCD.flush();

                        }

                    }

                }
            } catch (ConnectException ce) {
                logger.error("Connect exception, retry in 2 seconds");
                logger.debug("Detail on the connect exception", ce);
                WebSocketConnectionHandler.ws_sendMsg("restart-redirection-server");

            } catch (IOException e) {
                logger.debug("An IOException was thrown", e);
            } finally {
                if (socket != null) try {
                    socket.close();
                    logger.debug("Socket to server closed...");
                } catch (IOException e) {
                    logger.debug("Socket to server still open...");
                    logger.debug("IOException @ socket.close()", e);
                }
                if (in != null)
                    try {
                        in.close();
                        logger.debug("Closed InputStream of server socket...");
                    } catch (IOException e) {
                        logger.debug("InputStream of server socket still open...");
                        logger.debug("IOException @ in.close()", e);
                    }
                /* Update UI */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                        serverStateCircle.setFill(Color.RED);
                    }
                });
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                logger.debug("An IOException was thrown @ Thread.sleep()", e);
            }
        }
        logger.debug("Exit RemoteGDBConnector Thread");

    }
}
