package at.embsys.sat.websocket;


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
    private static String modeOfOperation = "flash";

    public static String getModeOfOperation() {
        return modeOfOperation;
    }

    @OnWebSocketClose
    public void onClose(int statusCode, String reason) {
        System.out.println("Close: statusCode=" + statusCode + ", reason=" + reason);
        WebSocketServer.updateWebsocketState(true);
        outbound = null;
    }

    @OnWebSocketError
    public void onError(Throwable t) {
        System.out.println("Error: " + t.getMessage());
    }

    @OnWebSocketConnect
    public void onConnect(Session session) {
        System.out.println("Connect: " + session.getRemoteAddress().getAddress());

        WebSocketServer.updateWebsocketState(false);
        outbound = session;
    }

    @OnWebSocketMessage
    public void onMessage(String message)  {

        System.out.println("Message" + message.length() + " :" + message);
        if (message.contains("JLink:")) {

            String jlinkPath = message.replace("JLink:", "");
            WebSocketServer.updateJLinkPath(jlinkPath);

        }
        if (message.contains("OOCD:")) {

            String oocdPath = message.replace("OOCD:", "");
            WebSocketServer.updateOOCDPath(oocdPath);

        }
        if (message.contains("restart-redirection-service")) {
            System.out.println("Restart!!!!!");
            OnChipDebugSystemSoftwareJLink.restartJLinkRedirectService();
            OnChipDebugSystemSoftwareOpenOCD.restartOOCDRedirectService();
        }

        if (message.contains("IP=")) WebSocketServer.updateIP(message.substring(message.indexOf("=") + 1));
        if (message.contains("Port="))WebSocketServer.updatePort(message.substring(message.indexOf("=") + 1));

        if (message.contains("HW=")) WebSocketServer.setDebugConfiguration(message.substring(message.indexOf("=") + 1));
        if (message.contains("XMC4500-state")&& !RedirectToJLink.isXmc4500_connected())ws_sendMsg("xmc4500-offline");

        if (message.contains("XMC4500-state")&& RedirectToJLink.isXmc4500_connected()) ws_sendMsg("xmc4500-online");
        if (message.contains("TM4C1294XL-state")&& !RedirectToOOCD.isLaunchpad_connected())ws_sendMsg("tm4C1294xl-offline");

        if (message.contains("TM4C1294XL-state")&& RedirectToOOCD.isLaunchpad_connected()) ws_sendMsg("tm4c1294xl-online");
        if (message.contains("flash")) {
            modeOfOperation = "flash";
        }
        if (message.contains("debug")) {
            //ServerConnector.setModeOfOperation("debug");
            //ServerConnector.getOutToServer().write("debug".getBytes());
            //ServerConnector.getOutToServer().flush();
            modeOfOperation = "debug";
        }
    }

    public synchronized static void ws_sendMsg(String msg) {

        try {
            outbound.getRemote().sendString(msg);
        } catch (IOException e) {
            e.printStackTrace();
        }

    }
}