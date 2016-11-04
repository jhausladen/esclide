package at.embsys.sat;

import at.embsys.sat.jlink.RedirectToJLink;
import at.embsys.sat.oocd.RedirectToOOCD;
import at.embsys.sat.websocket.WebSocketServer;
import javafx.application.Platform;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;

import java.io.*;
import java.net.ConnectException;
import java.net.Socket;

/**
 * Created by juergen on 30.07.14.
 */
public class RemoteGDBConnector implements Runnable {

    private String server = "127.0.0.1";
    private final Circle serverStateCircle;
    private WebSocketServer websocketServer;

    public RemoteGDBConnector(Circle crc, WebSocketServer wsserver) {
        serverStateCircle = crc;
        websocketServer = wsserver;
    }

    private int port = 4445;
    private Socket socket;

    private static OutputStream outToJLink = null;
    private static OutputStream outToOOCD = null;

    private boolean end = false;

    public static void setOutToOOCD(OutputStream outToOOCD) {
        RemoteGDBConnector.outToOOCD = outToOOCD;
    }

    public static void setOutToJLink(OutputStream outToJLink) {
        RemoteGDBConnector.outToJLink = outToJLink;
    }

    public void setEnd(boolean end) {
        this.end = end;
    }

    public Socket getSocket() {
        return socket;
    }

    @Override
    public void run() {

        while (!end) {
            // Create socket that is connected to server on specified port
            try {

                server = websocketServer.getIp();
                port = websocketServer.getDebugport();
                socket = new Socket(server, port);
                System.out.println("Connected to server...");
                /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                            /* entsprechende UI Komponente updaten */
                        serverStateCircle.setFill(Color.GREEN);
                    }
                });

                outToJLink = null;
                outToOOCD = null;

                InputStream in = socket.getInputStream();

                OutputStream outToServer = socket.getOutputStream();

                RedirectToJLink.setOutToServer(outToServer);

                RedirectToOOCD.setOutToServer(outToServer);

                /* Wird mit 0 initialisiert */
                int anzahlZeichen;

                byte[] buffer = new byte[200];

                System.out.println("Wait@RemoteGDBConnector");
                while ((anzahlZeichen = in.read(buffer)) >= 0) {


                    if (WebSocketServer.getDebugHardware().matches("XMC4500") && outToJLink != null) {

                        outToJLink.write(buffer, 0, anzahlZeichen);
                        outToJLink.flush();

                    }
                    if (WebSocketServer.getDebugHardware().matches("TM4C1294XL") && outToOOCD != null) {
                        try {
                            outToOOCD.write(buffer, 0, anzahlZeichen);
                            outToOOCD.flush();
                        }catch (Exception e){break;};



                    }

                }
                 /* UI updaten */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {
                            /* entsprechende UI Komponente updaten */
                        serverStateCircle.setFill(Color.RED);
                    }
                });
                /* Close the socket and its streams */
                socket.close();

            } catch (ConnectException ce) {
                System.out.println("Retry in 3 seconds");
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
            try {
                Thread.sleep(3000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

    }
}
