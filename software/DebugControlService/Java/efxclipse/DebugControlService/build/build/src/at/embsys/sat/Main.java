package at.embsys.sat;

import at.embsys.sat.jlink.OnChipDebugSystemSoftwareJLink;
import at.embsys.sat.jlink.RedirectToJLink;
import at.embsys.sat.oocd.OnChipDebugSystemSoftwareOpenOCD;
import at.embsys.sat.oocd.RedirectToOOCD;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import at.embsys.sat.websocket.WebSocketServer;
import javafx.application.Application;
import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.event.EventHandler;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.control.Label;
import javafx.scene.image.Image;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;
import javafx.stage.WindowEvent;

import java.util.ArrayList;
import java.util.List;


// -Dglass.platform=Monocle -Dmonocle.platform=Headless -Dprism.order=sw

public class Main extends Application {

    private WebSocketServer websocketServer;
    private OnChipDebugSystemSoftwareJLink ocdssJlink;
    private OnChipDebugSystemSoftwareOpenOCD ocdssOOCD;
    private PlatformDetector platformDetector;
    //private static String hwPlatform, serialNumber;
    private static int wsPort,jlinkPort, oocdPort, startJlink=1, startOOCD=1;
    private RemoteGDBConnector remotegdbconnector;
    private static List<String> deviceInfo = new ArrayList<String>();
    private static ObservableList optionsPlatform = FXCollections.observableArrayList();
    private String manufacturer = "Infineon TI";

    @Override
    public void start(final Stage primaryStage) throws Exception {
        Parent root = FXMLLoader.load(getClass().getResource("debugcontrolservice.fxml"));
        primaryStage.getIcons().add(new Image(this.getClass().getResourceAsStream("DebugControlService.png")));
        primaryStage.setTitle("Debug-Control Service");
        primaryStage.setScene(new Scene(root, 670, 275));
        primaryStage.show();

        Circle websocketState = (Circle) primaryStage.getScene().lookup("#browserStateCircle");
        Circle jlinkState = (Circle) primaryStage.getScene().lookup("#jlinkGDBServerState");
        Circle oocdState = (Circle) primaryStage.getScene().lookup("#openOCDState");
        //Circle oocdState = (Circle) primaryStage.getScene().lookup("#openOCDState");
        Circle serverState = (Circle) primaryStage.getScene().lookup("#serverStateCircle");
        Label ip = (Label) primaryStage.getScene().lookup("#serverIpLabel");
        Label port = (Label) primaryStage.getScene().lookup("#serverPortLabel");
        Label platform = (Label) primaryStage.getScene().lookup("#developmentPlatform");
        TextArea debugConsoleJlink = (TextArea) primaryStage.getScene().lookup("#debugConsoleJlink");
        TextArea debugConsoleOOCD = (TextArea) primaryStage.getScene().lookup("#debugConsoleOOCD");
        RadioButton radiobtnJlink = (RadioButton) primaryStage.getScene().lookup("#radiobtnJlink");
        RadioButton radiobtnOOCD = (RadioButton) primaryStage.getScene().lookup("#radiobtnOOCD");
        Label labelJlinkPath = (Label) primaryStage.getScene().lookup("#jlinkpath");
        Label labelOOCDPath = (Label) primaryStage.getScene().lookup("#oocdpath");
        final ComboBox comboBoxHardware = (ComboBox) primaryStage.getScene().lookup("#comboBoxPlatformList");
        final ComboBox comboBoxDeviceList = (ComboBox) primaryStage.getScene().lookup("#comboBoxDevPlatform");

        optionsPlatform= FXCollections.observableArrayList();
        optionsPlatform.addAll(manufacturer.split(" "));
        comboBoxDeviceList.setItems(optionsPlatform);
        if(comboBoxDeviceList.getSelectionModel().getSelectedItem() == null)comboBoxDeviceList.getSelectionModel().select(0);

        /* Start the websocket server thread*/
        websocketServer = new WebSocketServer(websocketState, ip, primaryStage, platform, radiobtnJlink, radiobtnOOCD, debugConsoleJlink, debugConsoleOOCD, labelJlinkPath, port, labelOOCDPath, wsPort, comboBoxDeviceList);
        Thread websocketThread = new Thread(websocketServer);
        websocketThread.start();

         /* Start the JLink thread */
        platformDetector = new PlatformDetector(comboBoxHardware,deviceInfo.get(0),comboBoxDeviceList);
        Thread platformDetectorThread = new Thread(platformDetector);
        platformDetectorThread.start();

        /* Start the JLink thread */
        ocdssJlink = new OnChipDebugSystemSoftwareJLink(debugConsoleJlink, jlinkState, labelJlinkPath,comboBoxHardware,jlinkPort,deviceInfo);
        Thread ocdssJlinkThread = new Thread(ocdssJlink);
        if(startJlink == 1)ocdssJlinkThread.start();

        /* Start the OOCD thread */
        ocdssOOCD = new OnChipDebugSystemSoftwareOpenOCD(debugConsoleOOCD,oocdState, labelOOCDPath, comboBoxHardware,oocdPort,deviceInfo) ;
        Thread ocdssOpenOCDThread = new Thread( ocdssOOCD );
        //ocdssThread.setDaemon(true);
        if(startOOCD == 1)ocdssOpenOCDThread.start();

         /* Start the TCP/IP JLink connection Thread*/
        remotegdbconnector = new RemoteGDBConnector(serverState, websocketServer);
        Thread remoteGDBConnectorThread = new Thread(remotegdbconnector);
        remoteGDBConnectorThread.start();

        /* Listen for platform selection */
        comboBoxDeviceList.valueProperty().addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue ov, String t, String t1) {

                if (platformDetector.getProcess() != null && t != null && t1 != null && !t.equals(t1)) {
                    platformDetector.setHwPlatform(t1);

                    if (t1.equals("Infineon")) {
                        comboBoxHardware.setItems(platformDetector.getAvailableDevices("Infineon"));
                        WebSocketConnectionHandler.ws_sendMsg("xmc4500-selection-changed");
                        if(RedirectToJLink.isXmc4500_connected())WebSocketConnectionHandler.ws_sendMsg("xmc4500-online");
                        else WebSocketConnectionHandler.ws_sendMsg("xmc4500-offline");
                    }
                    if (t1.equals("TI")) {
                        comboBoxHardware.setItems(platformDetector.getAvailableDevices("TI"));
                        WebSocketConnectionHandler.ws_sendMsg("tm4c1294xl-selection-changed");
                        System.out.println(RedirectToOOCD.isLaunchpad_connected());
                        if(RedirectToOOCD.isLaunchpad_connected())WebSocketConnectionHandler.ws_sendMsg("launchpad-online");
                        else WebSocketConnectionHandler.ws_sendMsg("launchpad-offline");
                    }

                }


            }
        });
        /* Listen for platform selection */
        comboBoxHardware.valueProperty().addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue ov, String t, String t1) {


                if (platformDetector.getProcess() != null && t != null && t1 != null && !t.equals(t1)) {

                    if (comboBoxDeviceList.getSelectionModel().getSelectedItem().equals("Infineon")) {
                        ocdssJlink.getOCDSProcess().destroy();

                        try {
                            ocdssJlink.getOCDSProcess().waitFor();
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    } else {
                        ocdssOOCD.getOCDSProcess().destroy();

                        try {
                            ocdssOOCD.getOCDSProcess().waitFor();
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }

                    }
                }


            }
        });

        /* Set a custom close Event for exiting OOCD and the websocket server */
        primaryStage.setOnCloseRequest(new EventHandler<WindowEvent>() {

            @Override
            public void handle(WindowEvent event) {
                primaryStage.close();
                /* Close websocket & server connection */
                try {
                    websocketServer.getServer().stop();
                    remotegdbconnector.setEnd(true);
                    remotegdbconnector.getSocket().close();
                } catch (Exception e) {
                    e.printStackTrace();
                }

                /* Close OCDS Threads */
                ocdssJlink.setEnd(true);
                if (ocdssJlink.getOCDSProcess() != null) ocdssJlink.getOCDSProcess().destroy();
                ocdssOOCD.setEnd(true);
                if (ocdssOOCD.getOCDSProcess() != null)ocdssOOCD.getOCDSProcess().destroy();
                platformDetector.setEnd(true);
                if (platformDetector.getProcess() != null)platformDetector.getProcess().destroy();


            }
        });

    }


    public static void main(String[] args) {
        /* Help */
        if(args != null && args.length > 0 && (args[0].equals("-h") || args[0].equals("--help"))){
            System.out.println("DebugControlService <Serial/default> <Websocketport> <JLinkport> <OOCDport> <StartJLink[ON=1/OFF=0]> <StartOOCD[ON=1/OFF=0]>");
            System.exit(1);
        }
        /* Device info */
        if(args != null && args.length > 6)deviceInfo.add(0,args[6]);
        else deviceInfo.add(0,null);
        if(args != null && args.length > 0)deviceInfo.add(1,args[0]);
        /* Websocket port */
        if(args != null && args.length > 1 )
        {
            try {
                wsPort = Integer.parseInt(args[1]);
            }
            catch (NumberFormatException e){
                System.out.println("Websocket Port can not be represented as an integer");
                System.exit(1);
            }
        }

        /* JLink Debug port */
        if(args != null && args.length > 2 )
        {
            try {
                jlinkPort = Integer.parseInt(args[2]);
            }
            catch (NumberFormatException e){
                System.out.println("JLink Port can not be represented as an integer");
                //if(!args[2].equals("null"))System.exit(1);
            }
        }
        /* OOCD Debug Port */
        if(args != null && args.length > 3 )
        {
            try {
                oocdPort = Integer.parseInt(args[3]);
            }
            catch (NumberFormatException e){
                System.out.println("OOCD Port can not be represented as an integer"+args[3]);
                //if(!args[3].equals("null")) System.exit(1);
            }
        }
        /* Start JLink/OOCD Thread */
        if(args != null && args.length > 4 )
        {
            startJlink = Integer.parseInt(args[4]);
        }
        if(args != null && args.length > 5 )
        {
            startOOCD = Integer.parseInt(args[5]);
        }

        launch(args);
        //new ToolkitApplicationLauncher().launch(Main.class,args);
    }


}
