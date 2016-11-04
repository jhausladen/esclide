/*
 * Author: Jürgen Hausladen
 * Copyright (c) 2016. SAT, FH Technikum Wien
 * License: AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

package at.embsys.sat;

import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.control.ComboBox;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class PlatformDetector implements Runnable {
    private Process procUSBDevices;
    private ObservableList<String> optionsInfineon = FXCollections.observableArrayList();
    private ObservableList<String> optionsTI = FXCollections.observableArrayList();
    private final ComboBox comboBoxHWList;
    private final ComboBox comboBoxManufacturer;
    private boolean end = false;
    private final String OS = System.getProperty("os.name").toLowerCase();
    private String processInput;

    /* Sets flag to end thread */
    public void setEnd(boolean end) {
        this.end = end;
    }

    public PlatformDetector(ComboBox comboBoxHardware, ComboBox comboboxManufacturer) {

        comboBoxHWList = comboBoxHardware;
        comboBoxManufacturer = comboboxManufacturer;

    }

    @Override
    public void run() {

        /* Instantiate logger */
        ch.qos.logback.classic.Logger logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(PlatformDetector.class);
        /* Set the log level */
        logger.setLevel(Main.logLevel);

        while (!end) {

            /* Check OS and get available USB devices */
            if (OS.contains("linux")) {
                try {
                    procUSBDevices = Runtime.getRuntime().exec("lsusb -v");
                } catch (IOException e) {
                    logger.warn(e.getMessage());
                }
            } else if (OS.contains("mac")) {
                try {
                    procUSBDevices = Runtime.getRuntime().exec("system_profiler SPUSBDataType");
                } catch (IOException e) {
                    logger.warn(e.getMessage());
                }
            } else if (OS.contains("windows")) {
                try {
                    procUSBDevices = Runtime.getRuntime().exec("wmic path CIM_LogicalDevice where \"Description like 'J-Link%'\" get /value");
                } catch (IOException e) {
                    logger.warn(e.getMessage());
                }
            } else {
                logger.error("Operating System not supported!");
            }

            /* Create Buffered readers for OCDS process */
            BufferedReader stdInputInit = new BufferedReader(new
                    InputStreamReader(procUSBDevices.getInputStream()));

            BufferedReader stdErrorInit = new BufferedReader(new
                    InputStreamReader(procUSBDevices.getErrorStream()));

            boolean isInfineon = false;
            boolean isTI = false;

            optionsInfineon = FXCollections.observableArrayList();
            optionsTI = FXCollections.observableArrayList();

            /* Add Infineon and TI device serial numbers to the dropdown list */
            try {

                while ((processInput = stdInputInit.readLine()) != null) {
                    /* Check OS, retrieve information on connected development boards and add
                     * the information to a list used to load in the appropriate UI component */
                    if (OS.contains("linux")) {
                        if (processInput.contains("SEGGER J-Link ARM") || processInput.contains("SEGGER J-Link PLUS"))
                            isInfineon = true;
                        if (processInput.contains("Texas Instruments")) isTI = true;
                        if (processInput.contains("iSerial") && (isInfineon || isTI)) {

                            //System.out.println(processInput);

                            if (isInfineon) {
                                optionsInfineon.add(processInput.split(" ")[processInput.split(" ").length - 1]);
                            }
                            if (isTI)
                                optionsTI.add(processInput.split(" ")[processInput.split(" ").length - 1]);
                            isInfineon = false;
                            isTI = false;

                        }
                    } else if (OS.contains("mac")) {

                        if (processInput.contains("J-Link")) isInfineon = true;
                        if (processInput.contains("Texas Instruments")) isTI = true;
                        if (processInput.contains("Serial Number: ") && (isInfineon || isTI)) {

                            //System.out.println(processInput);

                            if (isInfineon) {
                                optionsInfineon.add((processInput.split(":")[processInput.split(":").length - 1]).replace(" ", ""));
                            }
                            if (isTI)
                                optionsTI.add((processInput.split(":")[processInput.split(":").length - 1]).replace(" ", ""));
                            isInfineon = false;
                            isTI = false;

                        }
                    } else if (OS.contains("windows")) {
                        if (processInput.contains("J-Link driver")) isInfineon = true;
                        //if (processInput.contains("Texas Instruments")) isTI = true;
                        if (processInput.contains("PNPDeviceID") && (isInfineon || isTI)) {

                            //System.out.println(processInput);

                            if (isInfineon) {
                                if (!optionsInfineon.contains(processInput.split("\\\\")[processInput.split("\\\\").length - 1]))
                                    optionsInfineon.add(processInput.split("\\\\")[processInput.split("\\\\").length - 1]);
                            }
                            /*if (isTI == true)
                                optionsTI.add(processInput.split(" ")[processInput.split(" ").length - 1]);*/
                            isInfineon = false;
                            //isTI = false;

                        }
                    }

                }

                /* read any errors from the attempted command */
                while ((processInput = stdErrorInit.readLine()) != null) {
                    if (processInput != null)
                        logger.debug(processInput);
                }

            } catch (IOException e) {
                logger.debug("An IOException was thrown", e);
            } finally {
                /* Update UI */
                Platform.runLater(new Runnable() {
                    @Override
                    public void run() {

                        Object selectedItem = comboBoxHWList.getSelectionModel().getSelectedItem();
                        String selectedMan = comboBoxManufacturer.getSelectionModel().getSelectedItem().toString();
                        if (selectedMan.equals("Infineon")) comboBoxHWList.setItems(optionsInfineon);
                        else comboBoxHWList.setItems(optionsTI);
                        if (selectedItem != null) comboBoxHWList.getSelectionModel().select(selectedItem);
                        else {
                            if (optionsInfineon != null && optionsInfineon.size() > 0 && selectedMan.equals("Infineon"))
                                comboBoxHWList.getSelectionModel().select(optionsInfineon.get(0));
                            if (optionsTI != null && optionsTI.size() > 0 && selectedMan.equals("TI"))
                                comboBoxHWList.getSelectionModel().select(optionsTI.get(0));
                        }
                    }
                });
            }
            /* Sleep 2 seconds */
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                logger.debug("An IOException was thrown @ Thread.sleep()", e);
            }
        }
        logger.debug("Exit PlatformDetector Thread");
    }

    /* Return available devices */
    public ObservableList<String> getAvailableDevices(String platform) {

        if (platform.equals("Infineon")) return optionsInfineon;
        else return optionsTI;
    }

    /* Return the procUSBDevice process object */
    public Process getProcess() {
        return this.procUSBDevices;
    }

}
