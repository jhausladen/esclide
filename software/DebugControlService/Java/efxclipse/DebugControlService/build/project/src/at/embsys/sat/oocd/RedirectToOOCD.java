package at.embsys.sat.oocd;

import at.embsys.sat.RemoteGDBConnector;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import at.embsys.sat.websocket.WebSocketServer;
import javafx.application.Platform;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;

import java.io.*;
import java.net.Socket;

/**
 * Created by juergen on 30.07.14.
 */
public class RedirectToOOCD implements Runnable {

    private final String server = "127.0.0.1";
    private final int port = 3333;
    private final Circle oocdStateCircle;

    public static boolean isLaunchpad_connected() {
        return launchpad_connected;
    }

    private static boolean launchpad_connected = false;
    public RedirectToOOCD(Circle oocdState) {

        oocdStateCircle = oocdState;

    }

    public  OutputStream getOutToOOCDGDB() {
        return outToOOCDGDB;
    }
    private Socket socket;
    private OutputStream outToOOCDGDB;
    private  static OutputStream outToServer;

    public static void setOutToServer(OutputStream outToServer) {
        RedirectToOOCD.outToServer = outToServer;
    }

    @Override
    public void run() {

        // Create socket that is connected to server on specified port
        try {
            Thread.sleep(1000);
            socket = new Socket(server, OnChipDebugSystemSoftwareOpenOCD.getOocdPort());

            System.out.println("Connected to OOCD");

            InputStream in = socket.getInputStream();

            outToOOCDGDB =
                    socket.getOutputStream();

            outToOOCDGDB.write("+".getBytes());

            outToOOCDGDB.flush();

            RemoteGDBConnector.setOutToOOCD(outToOOCDGDB);
            /* Wird mit 0 initialisiert */
            int anzahlZeichen;
            byte[] buffer = new byte[200];
            System.out.println("Wait@RedirectToOOCD");

            /* UI updaten */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {

                    oocdStateCircle.setFill(Color.GREEN);
                }
            });
            WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-online");
            launchpad_connected = true;
            WebSocketConnectionHandler.ws_sendMsg("DBGControlServiceOOCD-ready");
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

                    oocdStateCircle.setFill(Color.RED);
                }
            });
            WebSocketConnectionHandler.ws_sendMsg("launchpad-offline");
            launchpad_connected = false;
            System.out.println("OOCD server closed ");


        } catch (IOException e) {

            e.printStackTrace();
            WebSocketConnectionHandler.ws_sendMsg("launchpad-offline");
            launchpad_connected = false;

        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("OOCD redirect Thread ends!");

    }
}
