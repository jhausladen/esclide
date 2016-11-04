package at.embsys.sat;

import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.event.ActionEvent;
import javafx.scene.control.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.stage.FileChooser;

import java.io.File;

public class Controller {
    public Circle browserStateCircle;
    public Circle serverStateCircle;
    public Label serverIpLabel;
    public Button clearConsoleLabel;
    public Circle openOCDState;
    public Circle jlinkGDBServerState;
    public RadioButton radiobtnJlink;
    public RadioButton radiobtnOOCD;
    public TextArea debugConsoleJlink;
    public TextArea debugConsoleOOCD;
    public Label jlinkpath;
    public Button selectjlink;
    public Label serverPortLAbel;
    public Label oocdpath;
    public Button selectoocd;
    public ChoiceBox platformList;
    public ComboBox comboBoxPlatformList;
    public ComboBox comboBoxDevPlatform;


    public void clearConsoleHistory(ActionEvent actionEvent) {

        debugConsoleJlink.clear();
        debugConsoleOOCD.clear();


    }

    public void showJlinkOutput(ActionEvent actionEvent) {
        debugConsoleOOCD.setVisible(false);
        debugConsoleJlink.setVisible(true);
    }

    public void showOOCDOutput(ActionEvent actionEvent) {
        debugConsoleJlink.setVisible(false);
        debugConsoleOOCD.setVisible(true);
    }

    public void selectJLink(ActionEvent actionEvent) {

        createFileChooserDialog("JLink");

    }

    public void selectOOCD(ActionEvent actionEvent) {

        createFileChooserDialog("OOCD");

    }

    public void createFileChooserDialog(String ocds){

        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Open Resource File");
        fileChooser.setInitialDirectory(
                new File(System.getProperty("user.home"))
        );
        File file = fileChooser.showOpenDialog(selectjlink.getScene().getWindow());
        if (file != null) {
            if(ocds == "JLink"){
                jlinkpath.setText(file.toString());
                jlinkpath.setTextFill(Color.BLACK);
            }
            else if(ocds == "OOCD"){
                oocdpath.setText(file.toString());
                oocdpath.setTextFill(Color.BLACK);
            }

            WebSocketConnectionHandler.ws_sendMsg(ocds + ":" + file.toString());
        }

    }
}
