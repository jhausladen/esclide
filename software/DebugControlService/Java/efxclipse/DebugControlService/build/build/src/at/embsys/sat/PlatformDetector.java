package at.embsys.sat;

import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.control.ComboBox;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * Created by juergen on 24.03.15.
 */
public class PlatformDetector implements Runnable{
    private Process procUSBDevices;
    private static ObservableList<String> optionsInfineon = FXCollections.observableArrayList();
    private static ObservableList<String> optionsTI = FXCollections.observableArrayList();
    private String processInput;
    private final ComboBox comboBoxHWList, comboBoxManufacturer;
    private boolean end = false;
    private final String OS = System.getProperty("os.name").toLowerCase();

    public void setHwPlatform(String hwPlatform) {
        this.hwPlatform = hwPlatform;
    }

    private String hwPlatform;
    public void setEnd(boolean end) {
        this.end = end;
    }

    public PlatformDetector(ComboBox comboBoxHardware, String platform, ComboBox comboboxManufacturer) {

        comboBoxHWList = comboBoxHardware;
        comboBoxManufacturer = comboboxManufacturer;
        hwPlatform = platform;
    }

    @Override
    public void run() {


        while (!end) {

            /* Get USB devices */
             /* Check OS */
            if ((OS.contains("linux") || OS.contains("mac"))) {
                try {

                    procUSBDevices = Runtime.getRuntime().exec("lsusb -v");
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            else if (OS.contains("windows")) {
                try {

                    procUSBDevices = Runtime.getRuntime().exec("wmic path CIM_LogicalDevice where \"Description like 'J-Link%'\" get /value");
                } catch (IOException e) {
                    e.printStackTrace();
                }
            } else {
                System.out.println("Operating System not supported!");
            }

            /* Create Buffered reader for OCDS process */
            BufferedReader stdInputInit = new BufferedReader(new
                    InputStreamReader(procUSBDevices.getInputStream()));

            BufferedReader stdErrorIniz = new BufferedReader(new
                    InputStreamReader(procUSBDevices.getErrorStream()));

            boolean isInfineon = false;
            boolean isTI = false;

            optionsInfineon = FXCollections.observableArrayList();
            optionsTI = FXCollections.observableArrayList();

            /* Add XMC4500 serial numbers to the dropdown list */
            try {
                while ((processInput = stdInputInit.readLine()) != null) {

                    if ((OS.contains("linux") || OS.contains("mac"))) {
                        if (processInput.contains("SEGGER J-Link ARM")) isInfineon = true;
                        if (processInput.contains("Texas Instruments")) isTI = true;
                        if (processInput.contains("iSerial") && (isInfineon == true || isTI == true)) {

                            System.out.println(processInput);

                            if (isInfineon == true) {
                                optionsInfineon.add(processInput.split(" ")[processInput.split(" ").length - 1]);
                                System.out.println(processInput.split(" ")[processInput.split(" ").length - 1] + "X");
                            }
                            if (isTI == true)
                                optionsTI.add(processInput.split(" ")[processInput.split(" ").length - 1]);
                            isInfineon = false;
                            isTI = false;

                        }
                    }
                    else if (OS.contains("windows")) {
                        if (processInput.contains("J-Link driver")) isInfineon = true;
                        //if (processInput.contains("Texas Instruments")) isTI = true;
                        if (processInput.contains("PNPDeviceID") && (isInfineon == true || isTI == true)) {

                            System.out.println(processInput);

                            if (isInfineon == true) {
                                if(!optionsInfineon.contains(processInput.split("\\\\")[processInput.split("\\\\").length - 1]))optionsInfineon.add(processInput.split("\\\\")[processInput.split("\\\\").length - 1]);
                                System.out.println("WinJLink:"+processInput.split("\\\\")[processInput.split("\\\\").length - 1] + "X");
                            }
                            /*if (isTI == true)
                                optionsTI.add(processInput.split(" ")[processInput.split(" ").length - 1]);*/
                            isInfineon = false;
                            //isTI = false;

                        }
                    }

                }
            } catch (IOException e) {
                e.printStackTrace();
            }
            /* UI updaten */
            Platform.runLater(new Runnable() {
                @Override
                public void run() {
                    /* entsprechende UI Komponente updaten */
                    //System.out.println(comboBoxHWList.getSelectionModel().getSelectedItem().toString());
                    Object selectedItem = comboBoxHWList.getSelectionModel().getSelectedItem();
                    String selectedMan = comboBoxManufacturer.getSelectionModel().getSelectedItem().toString();
                    if(selectedMan.equals("Infineon"))comboBoxHWList.setItems(optionsInfineon);
                    else comboBoxHWList.setItems(optionsTI);
                    if(selectedItem != null)comboBoxHWList.getSelectionModel().select(selectedItem);
                }
            });
            /* Sleep 5 seconds */
            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }


    public ObservableList<String> getAvailableDevices(String platform){


        if(platform.equals("Infineon"))return optionsInfineon;
        else return optionsTI;
    }
    public Process getProcess() {
        return this.procUSBDevices;
    }

}
