/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat;

import at.embsys.sat.jlink.OnChipDebugSystemSoftwareJLink;
import at.embsys.sat.oocd.OnChipDebugSystemSoftwareOpenOCD;
import at.embsys.sat.websocket.WebSocketConnectionHandler;
import javafx.event.ActionEvent;
import javafx.scene.control.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.stage.FileChooser;

import java.io.File;
import java.io.IOException;

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
    public Label oocdpath;
    public Button selectoocd;
    public ComboBox comboBoxPlatformList;
    public ComboBox comboBoxDevPlatform;


    /* Clears the console history */
    public void clearConsoleHistory(ActionEvent actionEvent) {
        debugConsoleJlink.clear();
        debugConsoleOOCD.clear();
    }

    /* Shows the debug output of the JLink GDB server */
    public void showJlinkOutput(ActionEvent actionEvent) {
        debugConsoleOOCD.setVisible(false);
        debugConsoleJlink.setVisible(true);
    }

    /* Shows the debug output of OpenOCD */
    public void showOOCDOutput(ActionEvent actionEvent) {
        debugConsoleJlink.setVisible(false);
        debugConsoleOOCD.setVisible(true);
    }

    /* Opens a dialog to choose the JLinkGDBServer executable */
    public void selectJLink(ActionEvent actionEvent) {
        createFileChooserDialog("JLink");
    }

    /* Opens a dialog to choose the OpenOCD executable */
    public void selectOOCD(ActionEvent actionEvent) {
        createFileChooserDialog("OOCD");
    }

    /* Creates the file chooser dialog*/
    private void createFileChooserDialog(String ocds) {

        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Open Resource File");
        fileChooser.setInitialDirectory(
                new File(System.getProperty("user.home"))
        );
        File file = fileChooser.showOpenDialog(selectjlink.getScene().getWindow());
        if (file != null) {
            if (ocds.equals("JLink")) {
                OnChipDebugSystemSoftwareJLink.setNewJLinkExecSelected(true);
                jlinkpath.setText(file.toString());
                jlinkpath.setTextFill(Color.BLACK);
            } else if (ocds.equals("OOCD")) {
                OnChipDebugSystemSoftwareOpenOCD.setNewOOCDExecSelected(true);
                oocdpath.setText(file.toString());
                oocdpath.setTextFill(Color.BLACK);
            }
            /* Save the path to the choosen executable on the server */
            WebSocketConnectionHandler.ws_sendMsg(ocds + ":" + file.toString());
        }

    }

    /* Reset the TCP connection between the debug-control service and the server */
    public void resetConnection(ActionEvent actionEvent) {

        WebSocketConnectionHandler.ws_sendMsg("restart-redirection-server");

        RemoteGDBConnector.closeSocket();

    }
}
