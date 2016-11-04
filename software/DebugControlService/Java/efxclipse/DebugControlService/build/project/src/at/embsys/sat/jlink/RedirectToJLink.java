package at.embsys.sat.jlink;

import at.embsys.sat.RemoteGDBConnector;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.application.Platform;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;

import java.io.*;
import java.net.Socket;

/**
 * Created by juergen on 30.07.14.
 */
public class RedirectToJLink implements Runnable {

    private final String server = "127.0.0.1";
    private int port = 2331;
    private final Circle xmc4500StateCircle;

    public static boolean isXmc4500_connected() {
        return xmc4500_connected;
    }

    private static boolean xmc4500_connected = false;
    public RedirectToJLink(Circle jlinkState) {

        xmc4500StateCircle = jlinkState;

    }

    public  OutputStream getOutToJLinkGDB() {
        return outToJLinkGDB;
    }

    private OutputStream outToJLinkGDB;
    private  static OutputStream outToServer;

    public static void setOutToServer(OutputStream outToServer) {
        RedirectToJLink.outToServer = outToServer;
    }

    @Override
    public void run() {

        // Create socket that is connected to server on specified port
        try {

            Socket socket = new Socket(server, OnChipDebugSystemSoftwareJLink.getjLinkPort());
            System.out.println("Connected to jlink");

            InputStream in = socket.getInputStream();


            outToJLinkGDB =
                    socket.getOutputStream();

            RemoteGDBConnector.setOutToJLink(outToJLinkGDB);
            /* Wird mit 0 initialisiert */
            int anzahlZeichen;
            byte[] buffer = new byte[200];
            System.out.println("Wait@RedirectToJLink");

            /* UI updaten */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {

                    xmc4500StateCircle.setFill(Color.GREEN);
                }
            });
            WebSocketConnectionHandler.ws_sendMsg("xmc4500-online");
            xmc4500_connected = true;
            WebSocketConnectionHandler.ws_sendMsg("DBGControlServiceJLink-ready");
            while ((anzahlZeichen = in.read(buffer)) >= 0) {

                if (outToServer != null) {
                    outToServer.write(buffer, 0, anzahlZeichen);
                    outToServer.flush();
                }

            }

            socket.close();  // Close the socket and its streams

            /* UI updaten */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {

                    xmc4500StateCircle.setFill(Color.RED);
                }
            });
            WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
            xmc4500_connected = false;
            System.out.println("JLink server closed ");


        } catch (IOException e) {
            e.printStackTrace();
            WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
            xmc4500_connected = false;

        }
        System.out.println("JLink redirect Thread ends!");

    }
}
