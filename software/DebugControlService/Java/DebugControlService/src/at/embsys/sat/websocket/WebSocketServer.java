/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat.websocket;

import at.embsys.sat.Main;
import javafx.application.Platform;
import javafx.scene.control.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;
import javafx.stage.WindowEvent;
import org.eclipse.jetty.http.HttpVersion;
import org.eclipse.jetty.server.*;
import org.eclipse.jetty.util.ssl.SslContextFactory;
import org.eclipse.jetty.websocket.server.WebSocketHandler;
import org.eclipse.jetty.websocket.servlet.WebSocketServletFactory;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;


public class WebSocketServer implements Runnable {
    private Server websocketServer;
    private final Stage primaryStage;
    private boolean overwriteWebsocketport = false;
    private String keyStoreFilePath = "";
    private String keyStorePassword = "cloud-emb";
    private int webSocketServerPort = 8080;

    private static ComboBox comboboxDeviceList;
    private static Circle websocketStateCircle;
    private static String ip;
    private static int debugport = 4445;
    private static Label labelIpAddr, labelServerPort;
    private static boolean listen;
    private static String debugHardware;
    private static Label platformLabel;
    private static RadioButton radioBtnJlink, radioBtnOOCD;
    private static TextArea debugConsoleJlink, debugConsoleOOCD;
    private static Label jlinkPathLabel, oocdPathLabel;
    private static String jlinkPath, oocdPath;

    private static ch.qos.logback.classic.Logger logger;
    public static ch.qos.logback.classic.Logger loggerWsConnectionHandler;

    private final Alert alert = new Alert(Alert.AlertType.INFORMATION);

    /* Retrieve the websocket server */
    public Server getServer() {
        return websocketServer;
    }

    /* Retrieve the currently used development platform (XMC4500/TM4C1294XL) */
    public String getDebugHardware() {
        return debugHardware;
    }

    /* Konstruktor to pass the text area for displaying OOCD output */
    public WebSocketServer(Circle crc, Label ip, Stage stage, Label devPlatform, RadioButton rdbtnJlink, RadioButton rdbtnOOCD, TextArea dbgconsoleJlink, TextArea dbgconsoleOOCD, Label jlinkpth, Label port, Label oocdpth, int wsport, ComboBox comboBoxDeviceList, String keystorefilepath) {
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
        if (wsport != 0) webSocketServerPort = wsport;
        if (wsport != 0) overwriteWebsocketport = true;
        comboboxDeviceList = comboBoxDeviceList;
        keyStoreFilePath = keystorefilepath;
    }

    /* Update IP address received from the web IDE  */
    public static void updateIP(String ipaddr) {

        ip = ipaddr;
        logger.debug("Update ip address to " + ipaddr);

          /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                labelIpAddr.setText(ip);
            }
        });
    }

    /* Return the TCP debugport (GDB)*/
    public int getDebugport() {
        return debugport;
    }

    /* Update the TCP debugport (GDB) */
    public static void updatePort(String portnum) {

        try {
            debugport = Integer.parseInt(portnum.trim());
            logger.debug("Debug port set/updated to " + portnum);
            /* Update UI */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    labelServerPort.setText(String.valueOf(debugport));
                }
            });
        } catch (NumberFormatException e) {
            logger.debug("Debug port " + portnum + " can not be represented as an integer");
        }

    }

    /* Update the path to the JLink GDB server executable */
    public static void updateJLinkPath(String path) {

        jlinkPath = path;
        logger.debug("Update jlinkPath to " + jlinkPath);
        /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                jlinkPathLabel.setText(jlinkPath);
                jlinkPathLabel.setTextFill(Color.BLACK);
            }
        });
    }

    /* Update the path to the OpenOCD executable */
    public static void updateOOCDPath(String path) {

        oocdPath = path;
        logger.debug("Update oocdPath to " + oocdPath);
        /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {

                oocdPathLabel.setText(oocdPath);
                oocdPathLabel.setTextFill(Color.BLACK);
            }
        });
    }

    /* Update the status circle representing the websocket connection */
    public static void updateWebsocketState(boolean listening) {
        listen = listening;
        logger.debug("Update websocket server state (listen) " + listen);
          /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {

                if (listen) websocketStateCircle.setFill(Color.RED);
                else websocketStateCircle.setFill(Color.GREEN);
            }
        });
    }

    /* Set the development platform and update UI configuration*/
    public synchronized static void setDebugConfiguration(String hw) {

        debugHardware = hw;
        logger.debug("Set the development platform to " + debugHardware);
          /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {
                platformLabel.setText(debugHardware);
                if (debugHardware.matches("XMC4500")) comboboxDeviceList.getSelectionModel().select("Infineon");
                else comboboxDeviceList.getSelectionModel().select("TI");
            }
        });

    }

    /* Return the ip address */
    public String getIp() {
        return ip;
    }

    @Override
    public void run() {

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(WebSocketServer.class);
        loggerWsConnectionHandler = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(WebSocketConnectionHandler.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);
        loggerWsConnectionHandler.setLevel(Main.logLevel);

        /* Overwrite the websocket port configuration as needed */
        String fileName;
        if (!overwriteWebsocketport) {
            if (System.getProperty("user.home").equals("/root")) fileName = "/cloud9/wsport.conf";
            else fileName = System.getProperty("user.home") + "/SAT/escloud/configss/wsport.conf";

            try {
                List<String> lines = Files.readAllLines(Paths.get(fileName),
                        Charset.defaultCharset());

                webSocketServerPort = Integer.valueOf(lines.get(0));
            } catch (IOException e) {
                logger.warn("Could not read wsport.conf");
                logger.debug("An IOException was thrown @ readAllLines()" + e);
            } catch (NumberFormatException e) {
                logger.error("WebsocketServer Port " + webSocketServerPort + " can not be represented as an integer");
            }
        }

        /* Create secure websocket server */
        if (!keyStoreFilePath.isEmpty()) {
            websocketServer = new Server();
            WebSocketHandler wsHandler = new WebSocketHandler() {
                @Override
                public void configure(WebSocketServletFactory factory) {
                    factory.register(WebSocketConnectionHandler.class);
                }
            };
            websocketServer.setHandler(wsHandler);

            HttpConfiguration http_config = new HttpConfiguration();
            http_config.setSecureScheme("https");
            http_config.setSecurePort(webSocketServerPort);

            HttpConfiguration https_config = new HttpConfiguration(http_config);
            https_config.addCustomizer(new SecureRequestCustomizer());

            SslContextFactory sslContextFactory = new SslContextFactory();
            sslContextFactory.setKeyStorePath(keyStoreFilePath);
            sslContextFactory.setKeyStorePassword(keyStorePassword);

            ServerConnector wsConnector = new ServerConnector(websocketServer);
            wsConnector.setPort(webSocketServerPort + 1);
            websocketServer.addConnector(wsConnector);

            ServerConnector wssConnector = new ServerConnector(websocketServer,
                    new SslConnectionFactory(sslContextFactory,
                            HttpVersion.HTTP_1_1.asString()),
                    new HttpConnectionFactory(https_config));

            wssConnector.setPort(webSocketServerPort);
            websocketServer.addConnector(wssConnector);
        }
        /* Create unsecure websocket server */
        else {
            websocketServer = new Server(webSocketServerPort);
            WebSocketHandler wsHandler = new WebSocketHandler() {
                @Override
                public void configure(WebSocketServletFactory factory) {
                    factory.register(WebSocketConnectionHandler.class);
                }
            };
            websocketServer.setHandler(wsHandler);
        }
        try {
            /* Start websocket server */
            websocketServer.start();
            logger.info("Websocket server listening on Port " + webSocketServerPort);

        } catch (Exception e) {
            logger.error("Error starting Websocket server, port may already be used by another program");
            logger.debug("An Exception was thrown @ websocketServer.start()", e);

            /* Update UI */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    if (!alert.isShowing()) {
                        alert.setTitle("Websocket Port already in use!");
                        alert.setHeaderText(null);
                        alert.setContentText("The port for opening the Websocket connection is already in use!");
                        Optional<ButtonType> result = alert.showAndWait();
                        if (result.isPresent() && result.get() == ButtonType.OK) {
                            primaryStage.close();
                            primaryStage.fireEvent(
                                    new WindowEvent(
                                            primaryStage,
                                            WindowEvent.WINDOW_CLOSE_REQUEST
                                    )
                            );


                        }
                    }
                }
            });
        }

        /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {

                websocketStateCircle.setFill(Color.RED);
            }
        });

        /* Join */
        try {
            websocketServer.join();
        } catch (InterruptedException e) {
            logger.debug("Error when joining the websocket server");
            logger.debug("InterruptedException @ websocketServer.join()", e);
        }

          /* Update UI */
        Platform.runLater(new Runnable() {
            @Override
            public void run() {

                websocketStateCircle.setFill(Color.GREY);
            }
        });

        logger.debug("Exit WebSocketServer Thread");

    }

}