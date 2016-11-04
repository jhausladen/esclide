/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat.websocket;


import at.embsys.sat.Main;
import at.embsys.sat.jlink.OnChipDebugSystemSoftwareJLink;
import at.embsys.sat.jlink.RedirectToJLink;
import at.embsys.sat.oocd.OnChipDebugSystemSoftwareOpenOCD;
import at.embsys.sat.oocd.RedirectToOOCD;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketError;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;

import java.io.IOException;

@WebSocket
public class WebSocketConnectionHandler {

    private static Session outbound;
    private static String modeOfOperation = "";

    public static String getModeOfOperation() {
        return modeOfOperation;
    }

    /* Triggers if websocket connection is closed & update state*/
    @OnWebSocketClose
    public void onClose(int statusCode, String reason) {
        WebSocketServer.loggerWsConnectionHandler.info("Websocket connection closed with statusCode=" + statusCode + " reason=" + reason);
        WebSocketServer.updateWebsocketState(true);
        outbound = null;
    }

    /* Triggers if websocket connection encounters an error */
    @OnWebSocketError
    public void onError(Throwable t) {
        WebSocketServer.loggerWsConnectionHandler.error("Websocket connection encountered an error: " + t.getMessage());
    }

    /* Triggers if a connection is established & updates state*/
    @OnWebSocketConnect
    public void onConnect(Session session) {
        WebSocketServer.loggerWsConnectionHandler.info("Websocket connection established " + session.getRemoteAddress().getAddress());
        WebSocketServer.updateWebsocketState(false);
        outbound = session;
    }

    /* Triggers if a message is received */
    @OnWebSocketMessage
    public void onMessage(String message) {

        WebSocketServer.loggerWsConnectionHandler.debug("Received websocket message: " + message);
        /* Message used to update JLink executable path */
        if (message.contains("JLink:")) {

            String jlinkPath = message.replace("JLink:", "");
            WebSocketServer.updateJLinkPath(jlinkPath);

        }
        /* Message used to update OpenOCD executable path */
        if (message.contains("OOCD:")) {

            String oocdPath = message.replace("OOCD:", "");
            WebSocketServer.updateOOCDPath(oocdPath);

        }
        /* Message to restart the internal OnChipDebugSystemSoftware and their RedirectionService threads of the debug-control service */
        if (message.contains("restart-redirection-service")) {
            if (OnChipDebugSystemSoftwareJLink.rebootRequired) {
                OnChipDebugSystemSoftwareJLink.stopJLinkRedirectService();
                if (OnChipDebugSystemSoftwareJLink.getOCDSProcess() != null)
                    OnChipDebugSystemSoftwareJLink.getOCDSProcess().destroy();
                if (Main.target.equals("Infineon")) WebSocketConnectionHandler.ws_sendMsg("restart-required");

            }
            if (OnChipDebugSystemSoftwareOpenOCD.rebootRequired) {
                OnChipDebugSystemSoftwareOpenOCD.stopOOCDRedirectService();
                if (OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess() != null)
                    OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess().destroy();
                if (Main.target.equals("TI")) WebSocketConnectionHandler.ws_sendMsg("restart-required");

            }
            OnChipDebugSystemSoftwareJLink.restartJLinkRedirectService();
            OnChipDebugSystemSoftwareOpenOCD.restartOOCDRedirectService();
            modeOfOperation = "";
        }

        /* Message to update IP & Port information */
        if (message.contains("IP=")) WebSocketServer.updateIP(message.substring(message.indexOf("=") + 1));
        if (message.contains("Port=")) WebSocketServer.updatePort(message.substring(message.indexOf("=") + 1));

        /* Message to update the debug configuration (development platform)  */
        if (message.contains("HW=")) WebSocketServer.setDebugConfiguration(message.substring(message.indexOf("=") + 1));

        /* Send the status of available XMC4500 boards */
        if (message.contains("XMC4500-state") && !RedirectToJLink.isXmc4500_connected()) ws_sendMsg("xmc4500-offline");
        if (message.contains("XMC4500-state") && RedirectToJLink.isXmc4500_connected()) ws_sendMsg("xmc4500-online");

        /* Send the status of available TM4C1294XL boards */
        if (message.contains("TM4C1294XL-state") && !RedirectToOOCD.isLaunchpad_connected())
            ws_sendMsg("tm4C1294xl-offline");
        if (message.contains("TM4C1294XL-state") && RedirectToOOCD.isLaunchpad_connected())
            ws_sendMsg("tm4c1294xl-online");

        /* Set mode of operation to flash as the next operation */
        if (message.contains("flash")) {
            modeOfOperation = "flash";
        }
        /* Set mode of operation to debug as the next operation */
        if (message.contains("debug")) {
            modeOfOperation = "debug";
        }
    }

    /* Send a message via websocket server */
    public synchronized static void ws_sendMsg(String msg) {

        try {
            if (outbound != null) {
                outbound.getRemote().sendString(msg);
                WebSocketServer.loggerWsConnectionHandler.debug("Sent message \"" + msg + "\" via the websocket connection");
            } else WebSocketServer.loggerWsConnectionHandler.info("No active websocket connection available");

        } catch (IOException e) {
            WebSocketServer.loggerWsConnectionHandler.debug("Could not send message \"" + msg + "\" via websocket connection ");
        }
    }
}