/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat;

import at.embsys.sat.jlink.OnChipDebugSystemSoftwareJLink;
import at.embsys.sat.jlink.RedirectToJLink;
import at.embsys.sat.oocd.OnChipDebugSystemSoftwareOpenOCD;
import at.embsys.sat.oocd.RedirectToOOCD;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import at.embsys.sat.websocket.WebSocketServer;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.EventHandler;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.layout.VBox;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;
import javafx.stage.WindowEvent;
import org.slf4j.LoggerFactory;
import ch.qos.logback.classic.Level;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;


// -Dglass.platform=Monocle -Dmonocle.platform=Headless -Dprism.order=sw

public class Main extends Application {

    private WebSocketServer websocketServer;
    private OnChipDebugSystemSoftwareJLink ocdssJlink;
    private OnChipDebugSystemSoftwareOpenOCD ocdssOOCD;
    private PlatformDetector platformDetector;
    private RemoteGDBConnector remotegdbconnector;
    private double prefHeight = 400;
    //private static String hwPlatform, serialNumber;
    private static int wsPort;
    private static int jlinkPort;
    private static int oocdPort;
    private static int startJlink = 1;
    private static int startOOCD = 1;

    /* Required for the flash download feature of the IDE. The downloaded program is ran once a
     * network connection is established. Otherwise the GDB server halts the program every time
     * the hardware is successfully recognized, e.g., if the GDB server is restarted. */
    private static String jLinkGDBServerInitConfig = "go";

    private static boolean jLinkInitConfigAvailable = true;
    private static String keyStoreFilePath = "";
    private static String targetPlatform = "universal";
    public static String target = "Infineon";

    public static final List<String> deviceInfo = new ArrayList<String>();
    public static Level logLevel = Level.INFO;
    public static String logLevelJetty = "INFO";


    private final String OS = System.getProperty("os.name").toLowerCase();
    private final Alert alert = new Alert(Alert.AlertType.INFORMATION);

    private static ch.qos.logback.classic.Logger logger;

    @Override
    public void start(final Stage primaryStage) throws Exception {

        /* Create UI */
        Parent root = FXMLLoader.load(getClass().getResource("debugcontrolservice.fxml"));
        primaryStage.getIcons().add(new Image(this.getClass().getResourceAsStream("DebugControlService.png")));
        primaryStage.setTitle("Debug-Control Service");
        primaryStage.setScene(new Scene(root, 550, 170));
        primaryStage.show();

        /* Show an information dialog in case the creation of the JLink GDB server
         * initialization configuration failed at startup*/
        if (!jLinkInitConfigAvailable) {
            /* Update UI */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    if (!alert.isShowing()) {
                        alert.setTitle("JLink GDB server configuration failed!");
                        alert.setHeaderText(null);
                        alert.setContentText("Could not create/write configuration file to " + System.getProperty("user.home") + "/.debugcontrolservice/gdbinit");
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

        /* Retrieve UI components */
        Circle websocketState = (Circle) primaryStage.getScene().lookup("#browserStateCircle");
        Circle jlinkState = (Circle) primaryStage.getScene().lookup("#jlinkGDBServerState");
        Circle oocdState = (Circle) primaryStage.getScene().lookup("#openOCDState");
        Circle serverState = (Circle) primaryStage.getScene().lookup("#serverStateCircle");
        Label ip = (Label) primaryStage.getScene().lookup("#serverIpLabel");
        Label port = (Label) primaryStage.getScene().lookup("#serverPortLabel");
        Label platform = (Label) primaryStage.getScene().lookup("#developmentPlatform");
        final Label labelJlinkPath = (Label) primaryStage.getScene().lookup("#jlinkpath");
        final Label labelOOCDPath = (Label) primaryStage.getScene().lookup("#oocdpath");
        final TextArea debugConsoleJlink = (TextArea) primaryStage.getScene().lookup("#debugConsoleJlink");
        final TextArea debugConsoleOOCD = (TextArea) primaryStage.getScene().lookup("#debugConsoleOOCD");
        final RadioButton radiobtnJlink = (RadioButton) primaryStage.getScene().lookup("#radiobtnJlink");
        final RadioButton radiobtnOOCD = (RadioButton) primaryStage.getScene().lookup("#radiobtnOOCD");
        final ComboBox comboBoxHardware = (ComboBox) primaryStage.getScene().lookup("#comboBoxPlatformList");
        final ComboBox comboBoxDeviceList = (ComboBox) primaryStage.getScene().lookup("#comboBoxDevPlatform");
        TitledPane tpAdvanced = (TitledPane) primaryStage.getScene().lookup("#titledPaneAdvanced");
        final VBox vBoxJLink = (VBox) primaryStage.getScene().lookup("#vBoxJLink");
        final VBox vBoxOOCD = (VBox) primaryStage.getScene().lookup("#vBoxOOCD");

        /* Check if advanced menu should be made visible and resize the height according to last known state*/
        tpAdvanced.expandedProperty().addListener(new ChangeListener<Boolean>() {
            @Override
            public void changed(ObservableValue<? extends Boolean> observable, Boolean oldValue, Boolean newValue) {
                if (newValue == false) {
                    prefHeight = primaryStage.getHeight();
                    primaryStage.setHeight(200);
                } else primaryStage.setHeight(prefHeight);
            }
        });

         /* Check OS and set appropriate default path for the GDB servers */
        if ((OS.contains("linux"))) {
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    labelJlinkPath.setText("/usr/bin/JLinkGDBServer");
                    labelOOCDPath.setText("/usr/local/bin/openocd");
                }
            });
        } else if (OS.contains("windows")) {
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    labelJlinkPath.setText("C:\\Program Files (x86)\\SEGGER\\JLink_V510f\\JLinkGDBServerCL.exe");
                    labelOOCDPath.setText("C:\\Program Files\\GNU ARM Eclipse\\OpenOCD\\0.10.0-201601101000-dev\\bin\\openocd.exe");
                }
            });
        } else if (OS.contains("mac")) {
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    labelJlinkPath.setText("/Applications/SEGGER/JLink/JLinkGDBServer");
                    labelOOCDPath.setText("/Applications/GNU ARM Eclipse/OpenOCD/0.8.0-201501181257/bin/openocd");
                }
            });

        } else {
            logger.error("Operating System not supported!");
        }

        /* Add manufacturer options to UI (Infineon/TI) and select a default */
        ObservableList optionsPlatform = FXCollections.observableArrayList();
        String manufacturer = "Infineon TI";
        optionsPlatform.addAll(manufacturer.split(" "));
        comboBoxDeviceList.setItems(optionsPlatform);
        if (comboBoxDeviceList.getSelectionModel().getSelectedItem() == null)
            comboBoxDeviceList.getSelectionModel().select(0);

        /* Start the websocket server thread*/
        websocketServer = new WebSocketServer(websocketState, ip, primaryStage, platform, radiobtnJlink, radiobtnOOCD, debugConsoleJlink, debugConsoleOOCD, labelJlinkPath, port, labelOOCDPath, wsPort, comboBoxDeviceList, keyStoreFilePath);
        Thread websocketThread = new Thread(websocketServer);
        websocketThread.start();

         /* Start the platform detector thread */
        platformDetector = new PlatformDetector(comboBoxHardware, comboBoxDeviceList);
        Thread platformDetectorThread = new Thread(platformDetector);
        if (deviceInfo.get(1).equals("universal")) platformDetectorThread.start();

        /* Start the JLink thread */
        ocdssJlink = new OnChipDebugSystemSoftwareJLink(debugConsoleJlink, jlinkState, labelJlinkPath, comboBoxHardware, jlinkPort, deviceInfo);
        Thread ocdssJlinkThread = new Thread(ocdssJlink);
        if (startJlink == 1) ocdssJlinkThread.start();

        /* Start the OOCD thread */
        ocdssOOCD = new OnChipDebugSystemSoftwareOpenOCD(debugConsoleOOCD, oocdState, labelOOCDPath, comboBoxHardware, oocdPort, deviceInfo, targetPlatform);
        Thread ocdssOpenOCDThread = new Thread(ocdssOOCD);
        //ocdssThread.setDaemon(true);
        if (startOOCD == 1) ocdssOpenOCDThread.start();

         /* Start the TCP/IP JLink connection Thread*/
        remotegdbconnector = new RemoteGDBConnector(serverState, websocketServer, startOOCD, targetPlatform);
        Thread remoteGDBConnectorThread = new Thread(remotegdbconnector);
        remoteGDBConnectorThread.start();

        /* EventListener for selecting a board manufacturer */
        comboBoxDeviceList.valueProperty().addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue ov, String t, String t1) {
                /* Notify the web interface that the board manufacturer has changed
                 * and report the status of the corresponding development boards */
                if (platformDetector.getProcess() != null && t != null && t1 != null && !t.equals(t1)) {

                    if (t1.equals("Infineon")) {
                        /* Enable JLink GDB server VBox */
                        vBoxJLink.setVisible(true);
                        vBoxJLink.setMinHeight(Control.USE_COMPUTED_SIZE);
                        vBoxJLink.setMinWidth(Control.USE_COMPUTED_SIZE);
                        vBoxJLink.setPrefHeight(Control.USE_COMPUTED_SIZE);
                        vBoxJLink.setPrefWidth(Control.USE_COMPUTED_SIZE);
                        /* Disable OOCD VBox */
                        vBoxOOCD.setVisible(false);
                        vBoxOOCD.setMinHeight(0);
                        vBoxOOCD.setMinWidth(0);
                        vBoxOOCD.setPrefHeight(0);
                        vBoxOOCD.setPrefWidth(0);
                        /* Manage console output visibility */
                        radiobtnJlink.setSelected(true);
                        debugConsoleJlink.setVisible(true);
                        debugConsoleOOCD.setVisible(false);
                        /* Set available devices & send a message to the web IDE */
                        comboBoxHardware.setItems(platformDetector.getAvailableDevices("Infineon"));
                        WebSocketConnectionHandler.ws_sendMsg("xmc4500-selection-changed");
                        if (RedirectToJLink.isXmc4500_connected())
                            WebSocketConnectionHandler.ws_sendMsg("xmc4500-online");
                        else WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
                    }
                    if (t1.equals("TI")) {
                        /* Enable OpenOCD VBox */
                        vBoxOOCD.setVisible(true);
                        vBoxOOCD.setMinHeight(Control.USE_COMPUTED_SIZE);
                        vBoxOOCD.setMinWidth(Control.USE_COMPUTED_SIZE);
                        vBoxOOCD.setPrefHeight(Control.USE_COMPUTED_SIZE);
                        vBoxOOCD.setPrefWidth(Control.USE_COMPUTED_SIZE);
                        /* Disable JLink GDB server VBox */
                        vBoxJLink.setVisible(false);
                        vBoxJLink.setMinHeight(0);
                        vBoxJLink.setMinWidth(0);
                        vBoxJLink.setPrefHeight(0);
                        vBoxJLink.setPrefWidth(0);
                        /* Manage console output visibility */
                        radiobtnOOCD.setSelected(true);
                        debugConsoleJlink.setVisible(false);
                        debugConsoleOOCD.setVisible(true);
                        /* Set available devices & send a message to the web IDE */
                        comboBoxHardware.setItems(platformDetector.getAvailableDevices("TI"));
                        WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-selection-changed");
                        if (RedirectToOOCD.isLaunchpad_connected())
                            WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-online");
                        else WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-offline");
                    }
                    target = t1;
                }


            }
        });
        /* EventListener for board selection based on serial number */
        comboBoxHardware.valueProperty().addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue ov, String t, String t1) {
                /* Restart the appropriate OnChipDebugSystem thread if a new development board is selected */
                if (platformDetector.getProcess() != null && t != null && t1 != null && !t.equals(t1)) {

                    if (comboBoxDeviceList.getSelectionModel().getSelectedItem().equals("Infineon")) {
                        OnChipDebugSystemSoftwareJLink.stopJLinkRedirectService();
                        OnChipDebugSystemSoftwareJLink.getOCDSProcess().destroy();

                        try {
                            OnChipDebugSystemSoftwareJLink.getOCDSProcess().waitFor();
                        } catch (InterruptedException e) {
                            logger.debug("InterruptedException @ OnChipDebugSystemSoftwareJLink.getOCDSProcess().waitFor()", e);
                        }
                    } else {
                        OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess().destroy();

                        try {
                            OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess().waitFor();
                        } catch (InterruptedException e) {
                            logger.debug("InterruptedException @ OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess().waitFor()", e);
                        }

                    }
                }


            }
        });

        /* Set a custom close event for exiting JLink/OOCD TCP connection and the websocket server */
        primaryStage.setOnCloseRequest(new EventHandler<WindowEvent>() {

            @Override
            public void handle(WindowEvent event) {
                primaryStage.close();

                /* Close websocket & server connection
                 * Exception is raised in Jetty and therfore
                 * needs no finally statement */
                try {
                    websocketServer.getServer().stop();
                } catch (Exception e) {
                    logger.debug("Exception @ websocketServer.getServer().stop()", e);
                }
                remotegdbconnector.setEnd(true);
                try {
                    if (remotegdbconnector.getSocket() != null) remotegdbconnector.getSocket().close();
                } catch (IOException e) {
                    logger.debug("IOException @ remotegdbconnector.getSocket().close()", e);
                } finally {
                    /* Close OCDS Threads */
                    OnChipDebugSystemSoftwareJLink.stopJLinkRedirectService();
                    ocdssJlink.setEnd(true);
                    if (OnChipDebugSystemSoftwareJLink.getOCDSProcess() != null)
                        OnChipDebugSystemSoftwareJLink.getOCDSProcess().destroy();
                    ocdssOOCD.setEnd(true);
                    if (OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess() != null)
                        OnChipDebugSystemSoftwareOpenOCD.getOCDSProcess().destroy();
                    platformDetector.setEnd(true);
                    if (platformDetector.getProcess() != null) platformDetector.getProcess().destroy();
                }
            }
        });

    }


    public static void main(String[] args) {

        /* Set the Jetty logger implementation and level (DEBUG | INFO | WARN | IGNORE) */
        System.setProperty("org.eclipse.jetty.util.log.class",
                "org.eclipse.jetty.util.log.JavaUtilLog");
        System.setProperty("org.eclipse.jetty.util.log.class.LEVEL", logLevelJetty);

        /* Instantiate logger */
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(Main.class);
        /* Set the log level */
        logger.setLevel(logLevel);

        /* Initialize device info */
        deviceInfo.add(0, null);
        deviceInfo.add(1, "universal");

        if (args != null && args.length > 0) {
            for (int i = 0; i < args.length; i++) {

                /* Help */
                if ((args[i].equals("-h") || args[0].equals("--help"))) {
                    logger.info("DebugControlService -s <Serial/universal> -e <Websocketport> -j <JLinkport> -o <OOCDport> -sj <StartJLink[ON=1/OFF=0]> -so <StartOOCD[ON=1/OFF=0]> -m <Platform[XMC4500]/[TM4C1294XL]> -wsscert <Keystorepath>");
                    System.exit(1);
                }

                /* Enable verbose mode for detailed debug log */
                if ((args[i].equals("-v") || args[0].equals("--verbose"))) {
                    logLevel = Level.DEBUG;
                    logger.setLevel(logLevel);
                }

                /* Device info & target platform */
                if (args[i].equals("-m") && i + 1 < args.length && !args[i + 1].startsWith("-")) {
                    deviceInfo.set(0, args[i + 1]);
                    targetPlatform = args[i + 1];
                }
                if (args[i].equals("-s") && i + 1 < args.length && !args[i + 1].startsWith("-"))
                    deviceInfo.set(1, args[i + 1]);
                /* Websocket port */
                if (args[i].equals("-e")) {
                    try {
                        wsPort = Integer.parseInt(args[i + 1]);
                    } catch (NumberFormatException e) {
                        logger.warn("Websocket Port " + args[i + 1] + " can not be represented as an integer");
                        //System.exit(1);
                    }
                }
                /* JLink Debug port */
                if (args[i].equals("-j")) {
                    try {
                        jlinkPort = Integer.parseInt(args[i + 1]);
                    } catch (NumberFormatException e) {
                        logger.warn("JLink Port " + args[i + 1] + " can not be represented as an integer");
                        //System.exit(1);
                    }
                }
                /* OOCD Debug Port */
                if (args[i].equals("-o")) {
                    try {
                        oocdPort = Integer.parseInt(args[i + 1]);
                    } catch (NumberFormatException e) {
                        logger.warn("OOCD Port " + args[i + 1] + " can not be represented as an integer");
                        //System.exit(1);
                    }
                }
                /* Start JLink Thread */
                if (args[i].equals("-sj")) {
                    try {
                        startJlink = Integer.parseInt(args[i + 1]);
                    } catch (NumberFormatException e) {
                        logger.warn("StartJLink parameter " + args[i + 1] + " can not be represented as an integer");
                    }
                }
                /* Start OOCD Thread */
                if (args[i].equals("-so")) {
                    try {
                        startOOCD = Integer.parseInt(args[i + 1]);
                    } catch (NumberFormatException e) {
                        logger.warn("StartOOCD parameter " + args[i + 1] + " can not be represented as an integer");
                    }
                }
                /* Enable secure WebSocket server */
                if (args[i].equals("-wsscert") && i + 1 < args.length && !args[i + 1].startsWith("-"))
                    keyStoreFilePath = args[i + 1];

            }
        }

        /* Create JLink GDB server config directory */
        File gdbInitFile = new File(System.getProperty("user.home") + "/.debugcontrolservice/gdbinit");
        if (!gdbInitFile.getParentFile().exists()) {
            if (!gdbInitFile.getParentFile().mkdirs())
                logger.warn("Could not create config directory for JLink GDB server");
        }
        /* Create/Write initialization configuration for JLink GDB server */
        try {
            gdbInitFile.createNewFile();
            Files.write(Paths.get(System.getProperty("user.home") + "/.debugcontrolservice/gdbinit"), jLinkGDBServerInitConfig.getBytes());
        } catch (IOException e) {
            jLinkInitConfigAvailable = false;
            logger.error("Could not create/write config file for JLink GDB server");
        }

        launch(args);
        //new ToolkitApplicationLauncher().launch(Main.class,args);
    }
}
