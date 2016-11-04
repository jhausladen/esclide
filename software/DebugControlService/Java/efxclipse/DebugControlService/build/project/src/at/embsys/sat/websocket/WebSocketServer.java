package at.embsys.sat.websocket;

import at.embsys.sat.jlink.OnChipDebugSystemSoftwareJLink;
import at.embsys.sat.oocd.OnChipDebugSystemSoftwareOpenOCD;
import javafx.application.Platform;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.RadioButton;
import javafx.scene.control.TextArea;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;
import org.controlsfx.control.action.Action;
import org.controlsfx.dialog.Dialog;
import org.controlsfx.dialog.Dialogs;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.websocket.server.WebSocketHandler;
import org.eclipse.jetty.websocket.servlet.WebSocketServletFactory;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;


public class WebSocketServer implements Runnable {
    private static ComboBox comboboxDeviceList;

    public static String getDebugHardware() {
        return debugHardware;
    }

    private Server websocketServer;
    private static Circle websocketStateCircle;
    private static String ip;
    private static int debugport;
    private static Stage primaryStage;
    private static Label labelIpAddr, labelServerPort;
    private static boolean listen;
    private static String debugHardware;
    private static Label platformLabel;
    private static RadioButton radioBtnJlink, radioBtnOOCD;
    private static TextArea debugConsoleJlink, debugConsoleOOCD;
    private static Label jlinkPathLabel, oocdPathLabel;
    private static String jlinkPath,oocdPath;
    private static boolean overwriteWebsocketport = false;
    private static int webSocketServerPort = 8080;


    public Server getServer() {
        return websocketServer;
    }

    /* Konstruktor to pass the text area for displaying OOCD output */
    public WebSocketServer(Circle crc, Label ip, Stage stage, Label devPlatform, RadioButton rdbtnJlink, RadioButton rdbtnOOCD, TextArea dbgconsoleJlink, TextArea dbgconsoleOOCD, Label jlinkpth, Label port, Label oocdpth, int wsport, ComboBox comboBoxDeviceList) {
        websocketStateCircle = crc;
        labelIpAddr = ip;
        labelServerPort = port;
        primaryStage = stage;
        platformLabel = devPlatform;
        radioBtnJlink = rdbtnJlink;
        radioBtnOOCD = rdbtnOOCD;
        debugConsoleJlink = dbgconsoleJlink;
        debugConsoleOOCD = dbgconsoleOOCD;
        jlinkPathLabel = jlinkpth;
        oocdPathLabel = oocdpth;
        if(wsport != 0)webSocketServerPort = wsport;
        if(wsport != 0) overwriteWebsocketport = true;
        comboboxDeviceList = comboBoxDeviceList;
    }

    public static void updateIP(String ipaddr) {

        ip = ipaddr;
          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                /* entsprechende UI Komponente updaten */
                labelIpAddr.setText(ip);
            }
        });
    }

    public int getDebugport() {
        return debugport;
    }

    public static void updatePort(String portnum) {

        debugport = Integer.parseInt(portnum.trim());
        System.out.println(portnum);
          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                /* entsprechende UI Komponente updaten */
                labelServerPort.setText(String.valueOf(debugport));
            }
        });
    }

    public static void updateJLinkPath(String path) {

        jlinkPath = path;
          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                /* entsprechende UI Komponente updaten */
                jlinkPathLabel.setText(jlinkPath);
                jlinkPathLabel.setTextFill(Color.BLACK);
            }
        });
    }

    public static void updateOOCDPath(String path) {

        oocdPath = path;
          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                /* entsprechende UI Komponente updaten */
                oocdPathLabel.setText(oocdPath);
                oocdPathLabel.setTextFill(Color.BLACK);
            }
        });
    }

    public static void updateWebsocketState(boolean listening) {
        listen = listening;

          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                /* entsprechende UI Komponente updaten */
                if (listen) websocketStateCircle.setFill(Color.RED);
                else websocketStateCircle.setFill(Color.GREEN);
            }
        });

    }

    public synchronized static void setDebugConfiguration(String hw) {

        debugHardware = hw;

          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                /* entsprechende UI Komponente updaten */
                platformLabel.setText(debugHardware);
                if (debugHardware.matches("XMC4500")) {
                    radioBtnJlink.setSelected(true);
                    debugConsoleJlink.setVisible(true);
                    debugConsoleOOCD.setVisible(false);
                    comboboxDeviceList.getSelectionModel().select("Infineon");
                } else {
                    radioBtnOOCD.setSelected(true);
                    debugConsoleJlink.setVisible(false);
                    debugConsoleOOCD.setVisible(true);
                    comboboxDeviceList.getSelectionModel().select("TI");
                }
            }
        });

    }

    public String getIp() {
        return ip;
    }

    @Override
    public void run() {

        String fileName;
        if(!overwriteWebsocketport) {
            if (System.getProperty("user.home") == "/root") fileName = "/cloud9/wsport.conf";
            else fileName = System.getProperty("user.home") + "/SAT/escloud/configs/wsport.conf";

            try {
                List<String> lines = Files.readAllLines(Paths.get(fileName),
                        Charset.defaultCharset());

                webSocketServerPort = Integer.valueOf(lines.get(0));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }


        websocketServer = new Server(webSocketServerPort);
        WebSocketHandler wsHandler = new WebSocketHandler() {
            @Override
            public void configure(WebSocketServletFactory factory) {
                factory.register(WebSocketConnectionHandler.class);
            }
        };
        websocketServer.setHandler(wsHandler);


        try {
            websocketServer.start();
            System.out.println("Websocket server listening on Port "+webSocketServerPort);

        } catch (Exception e) {

            e.printStackTrace();
            /* UI updaten */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    /* entsprechende UI Komponente updaten */
                    Action response = Dialogs.create()
                            .owner(primaryStage)
                            .title("Websocket Port already in use")
                            .message("The port for opening the Websocket connection is already in use. Retry to open the Websocket server?")
                            .actions(Dialog.Actions.CLOSE)
                            .showConfirm();

                    if (response == Dialog.Actions.CLOSE) {
                        try {
                            websocketServer.stop();
                            primaryStage.close();
                        } catch (Exception e1) {
                            e1.printStackTrace();
                        }

                    }
                }
            });
        }
        System.out.println("Start");
             /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                            /* entsprechende UI Komponente updaten */
                websocketStateCircle.setFill(Color.RED);
            }
        });


        try {
            websocketServer.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        System.out.println("Join");
          /* UI updaten */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                            /* entsprechende UI Komponente updaten */
                websocketStateCircle.setFill(Color.GREY);
            }
        });

        System.out.println("Exit: Websocket Thread");

    }

}