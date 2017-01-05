/**
 * Embedded Developer Plugin for Cloud9 IDE
 * 
 * Is used to add menus to the top menu bar and initiate, compiling, flashing and debugging.
 * Debug controls are located in the embedded_debugger plugin
 * 
 * @author Jürgen Hausladen
 * @copyright 2016, SAT, FH Technikum Wien
 * @license AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

define(function (require, exports, module) {

    /* Define variables linking to core modules */
    var ext = require("core/ext");
    var ide = require("core/ide");

    /* Define variables linking to client modules (extensions) */
    var menus = require("ext/menus/menus");
    var commands = require("ext/commands/commands");
    var c9console = require("ext/console/console");
    var stddbg = require("ext/debugger/breakpoints");
    var markup = require("text!ext/embedded_developer/embedded_developer.xml");
    var fs = require("ext/filesystem/filesystem");
    var embeddeddebugger = require("ext/embedded_debugger/embedded_debugger");

    /* Global program variables */
    var path, objectFileName;
    var download, flash, pathtomake, debug, debugProjectPath;
    var wsport = "8080";
    var itemXMC4500, itemTM4C1294XL;
    var platform, ws;
    var activeWebSocket, activeWebSocketIp, localWebSocket;
    var webSocketArray = new Array();
    var apfWebSocketArray = new Array();
    var targetSideButton;
    var targetSideWsAddress;
    var customBreakpoints;
    var workspacepath;
    var pathTemp;
    var objectFileNameWithSuffix;
    var sourceFolderPath;
    var debugPort;
    var startDebuggerJLink = false;
    var startDebuggerOOCD = false;
    var startStdDebugger = false;
    var debugItem, flashItem;
    var isXMC4500Online = false;
    var isTM4C1294XLOnline = false;
    var noob = 0;
    var debugstdc = 0;
    var runstdc = 0;
    var workspacedir;
    var params = [];
    /* Begin declaring module */
    module.exports = ext.register("ext/embedded_developer/embedded_developer", {
        name: "Embedded Developer",
        dev: "SAT",
        alone: true,
        deps: [],
        type: ext.GENERAL,
        markup: markup,

        nodes: [],

        /* Init function (required) */
        init: function () {
            var _self = this;
            this.winEmbeddedDeveloper = winEmbeddedDeveloper;
            this.winTargetSide = winTargetSide;
            this.winWebsocketIP = winWebsocketIP;
            this.winWithParam = winWithParam;
            this.errormsg = errormsg;
            this.btnConsoleClear = btnConsoleClear;
            this.txtConsole = txtConsole;
            this.vbBoxIP = vBoxIP;
            this.txtBoxIP = txtBoxIP;

            /* When unloading the window */
            window.onbeforeunload = _self.onBeforeUnloadHandler;
            workspacedir = ide.workspaceDir.replace("/", "");

            /* Add "local" target side option to menu */
            _self.addTargetSide("Local", true);

            /* Send request for restoring debug port */
            var data = {
                command: "firmware",
                "publicdebugport": true,
                requireshandling: true
            };
            ide.send(data);

            /* Send request for noob conf */
            data = {
                command: "firmware",
                "noobconf": true,
                requireshandling: true
            };
            ide.send(data);


            /* Send request for getting workspace path */
            data = {
                command: "firmware",
                "operation": "workspacepath",
                requireshandling: true
            };
            ide.send(data);


            /* Send information on login to the server */
            var data = {
                command: "firmware",
                "logging": "User connected! (" + _self.getDateTime() + ")",
                requireshandling: true
            };
            ide.send(data);

            /* EventListener for the compile finished message */
            ide.addEventListener("socketMessage", function (e) {

                /* Adds additional line feed when cmdline process ends */
                if (e.message.type == "npm-module-exit") {

                    c9console.log("<div class='item console_log'></br></br></div>");
                }
                /* Gets the result on a successful firmware transmission */
                if (e.message.type == "result" && e.message.subtype == "firmware-transmission-success") c9console.log("<div class='item console_log' style='font-weight:bold;color:#00ff00'>" + apf.escapeXML("Firmware Transmission succeeded!") + "</div>");

                /* Gets the result about the full workspacepath */
                if (e.message.type == "result" && e.message.subtype[0] == "workspacepath") {
                    workspacepath = e.message.subtype[1];
                }
                /* Gets the result about the debug TCP Port */
                if (e.message.type == "result" && e.message.subtype[0] == "debugportconf") {
                    debugPort = e.message.subtype[1].toString().trim();
                    buttonServerPort.setCaption("Port: " + debugPort);
                    ws.send("Port=" + debugPort);
                }
                /* Gets the result about the noob config */
                if (e.message.type == "result" && e.message.subtype[0] == "noobconf") {
                    //debugPort = e.message.subtype[1]2.toString().trim();
                    if (e.message.subtype[1] == 1) setNoobConf(true);
                    else setNoobConf(false);
                }
                /* Gets the result about the Websocket Port */
                if (e.message.type == "result" && e.message.subtype[0] == "wsportconf") {
                    wsport = e.message.subtype[1];
                    startwebsocketclient("ws://127.0.0.1:" + wsport + "/");
                }
                /* Gets the result about all commandline ouput (Currently not in use) */
                if (e.message.type == "result" && e.message.subtype[0] == "commandlineOutput") {
                    c9console.log(e.message.subtype[1].toString().trim() + "\n");
                }
                /* Gets the result of stdout from C-Programs */
                if (e.message.type == "result" && e.message.subtype[0] == "stdout") {
                    c9console.log("<div class='item console_log'>" + apf.escapeXML("stdout: " + e.message.subtype[1].toString().trim()) + "</div>");
                }
                /* Gets the result of stderr from C-Programs */
                if (e.message.type == "result" && e.message.subtype[0] == "stderr") {
                    c9console.log("<div class='item console_log'>" + apf.escapeXML("stderr: " + e.message.subtype[1].toString().trim()) + "</div>");
                }
                /* Gets the breakpoints to be loaded into the IDE (path1:line,path2:line,) */
                if (e.message.type == "result" && e.message.subtype[0] == "loadBreakpoints") {
                    var bpToRestore = e.message.subtype[1].toString().split(",");
                    /* Initialize model */
                    mdlDbgBreakpoints.load('<data>\
                </data>');
                    for (var i = 0; i < bpToRestore.length - 1; i++) {
                        var row = bpToRestore[i].toString().split(":")[1];
                        var bp = apf.n("<breakpoint/>")
                            .attr("path", bpToRestore[i].toString().split(":")[0])
                            .attr("line", bpToRestore[i].toString().split(":")[1])
                            .attr("text", bpToRestore[i].toString().split(":")[0].replace("/workspace", "") + ":" + (+bpToRestore[i].toString().split(":")[1] + 1))
                            .attr("lineoffset", 0)
                            .attr("content", "")
                            .attr("enabled", true)
                            .node();
                        mdlDbgBreakpoints.appendXml(bp);
                    }

                }
                /* Gets the debug config, e.g., development platform and initializes the IDE */
                if (e.message.type == "result" && e.message.subtype[0] == "debugconf") {

                    if (e.message.subtype[1] == "XMC4500" && itemXMC4500 == undefined) {

                        initPlatform(true, false);
                        platform = "XMC4500";
                    }
                    else if (e.message.subtype[1] == "XMC4500" && itemXMC4500 != undefined) {

                        itemXMC4500.select();
                        platform = "XMC4500";
                    }
                    if (e.message.subtype[1] == "TM4C1294XL" && itemTM4C1294XL == undefined) {

                        initPlatform(false, true);
                        platform = "TM4C1294XL";
                    }
                    else if (e.message.subtype[1] == "TM4C1294XL" && itemTM4C1294XL != undefined) {

                        itemTM4C1294XL.select();
                        platform = "TM4C1294XL";
                    }

                }
                /* Gets the result about the saved Target Side Addresses */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigTargetSideAddresses") {

                    var tempwebSocketArray = e.message.subtype[1].split(":");
                    tempwebSocketArray = tempwebSocketArray[1].split(",");

                    for (index = 0; index < tempwebSocketArray.length; index++) {

                        if (tempwebSocketArray[index] != '') {
                            /* Add radiobutton representing local connection, 
                             * only select when it was selected before the reload */
                            if (tempwebSocketArray[index] == activeWebSocketIp) {
                                _self.addTargetSide(tempwebSocketArray[index], true);
                            }
                            else _self.addTargetSide(tempwebSocketArray[index], false);
                        }
                    }
                }
                /* Gets the result about the last active Target Side */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigActiveTargetSideAddress") {

                    var tempActivewebSocket = e.message.subtype[1].split(":");
                    activeWebSocketIp = tempActivewebSocket[1];
                    buttonTargetSide.setCaption("Target-Side: " + activeWebSocketIp);
                }
                /* Gets the result about the JLink path in the config */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigJLink") {

                    ws.send(e.message.subtype[1]);
                }
                /* Gets the result about the JLink path in the config */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigOOCD") {

                    ws.send(e.message.subtype[1]);
                }

                /* Gets the result about the flash process of the HW */
                if (e.message.type == "result" && e.message.subtype == "firmware-flashing-success") c9console.log("<div class='item console_log' style='font-weight:bold;color:#00ff00'>" + apf.escapeXML("Flashing succeeded!") + "</div>");

                /* Receive message that the GDB has exited and send a message
                 * to the server to re-initialize the connections */
                if (e.message.type == "result" && e.message.subtype == "gdb-exited") {
                    flashItem.disable();
                    debugItem.disable();
                    ws.send("restart-redirection-service");
                }
                /* Receives message from the server to restart OpenOCD service
                 * within the debug-control service */
                if (e.message.type == "result" && e.message.subtype == "restart-OOCD-service") ws.send("restart-OOCD-service");

                /* Gets the result about the TCP server status when there is no connection */
                if (e.message.type == "result" && e.message.subtype == "server-down") {
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#ff0000'>" + apf.escapeXML("Firmware transmission failed! ==> Server is down or port 4445 closed!") + "</div>");
                    _self.errormsg.setValue("The firmware transmission failed because of a connection failure!<br> Please check if the server application is up and running and port 4445 is open.");
                    _self.winEmbeddedDeveloper.setTitle("Error: FT Server Connection");
                    _self.winEmbeddedDeveloper.show();
                }
                /* Gets the result about the OOCD status when there is no connection */
                if (e.message.type == "result" && e.message.subtype == "oocd-down") {
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#ff0000'>" + apf.escapeXML("Flashing LPC1758 failed! ==> OpenOCD is down, port 4444 & 3333 are closed or Hardware is unplugged!") + "</div>");
                    _self.errormsg.setValue("The flash process for the LPC1758 failed because of a connection failure! <br> Please check if OpenOCD is up and running, port 4444 & 3333 are open and your Hardware is plugged in.");
                    _self.winEmbeddedDeveloper.setTitle("Error: OpenOCD Connection");
                    _self.winEmbeddedDeveloper.show();
                }
                /* Checks for the end of the compilation to download the file via the browser */
                if (e.message.type == "npm-module-exit" && download == 1) {
                    if (e.message.code == 0 && e.message.extra.original_line == ("make -C " + "/" + workspacedir + "/" + pathtomake + " all")) {
                        if (platform == "XMC4500" || platform == "TM4C1294XL") {
                            /* Check if the folder already exists */
                            fs.exists((ide.davPrefix + "/" + pathtomake + "bin/firmware.elf").replace(/\/+/, "/"), function (exists) {
                                if (exists) {
                                    /* Download file! */
                                    var popUp = window.open(window.location.href + "export?/workspace/" + pathtomake + "bin/firmware.elf", '_blank');
                                    window.setTimeout(function () {
                                        popUp.close();
                                    }, 1000);
                                }
                            });
                        }
                    }
                    /* Reset download flag */
                    download = 0;
                }
                /* Checks for the end of the compilation to flash the binary file directly onto the HW */
                if (e.message.type == "npm-module-exit" && flash == 1) {
                    if (e.message.code == 0 && e.message.extra.original_line == ("make -C " + "/" + workspacedir + "/" + pathtomake + " all")) {
                        if (platform == "XMC4500" || platform == "TM4C1294XL") {
                            /* Check if the folder already exists */
                            fs.exists((ide.davPrefix + "/" + pathtomake + "bin/firmware.elf").replace(/\/+/, "/"), function (exists) {
                                if (exists) {
                                    /* If we want to send something to our server plugin 
                                     * Sends path to firmware, and operation mode */
                                    var data = {
                                        command: "firmware",
                                        "path": pathtomake + "bin/firmware.elf",
                                        "operation": "flash",
                                        "platform": platform,
                                        requireshandling: true
                                    };
                                    ide.send(data);

                                    ws.send("flash");
                                    ws.send("HW=" + platform);

                                }
                            });
                        }
                    }
                    /* Reset flash flag */
                    flash = 0;
                }

                /* Checks for the end of the compilation to debug the HW */
                if (e.message.type == "npm-module-exit" && debug == 1) {
                    if (e.message.code == 0 && e.message.extra.original_line == ("make -C " + "/" + workspacedir + "/" + pathtomake + " all")) {
                        customBreakpoints = new Array();
                        /* Get the breakpoints */
                        var breakpoints = embeddeddebugger.getBreakPoints();
                        /* Get current project path "root/project" */
                        pathtomake = path.substring(0, path.indexOf('/src/')) + "/";

                        /* Set the current make path to our debug path */
                        debugProjectPath = pathtomake;

                        /* loop through breakpoints to get the filename and line number of the bp */
                        for (var i = 0; i < breakpoints.length; i++) {
                            var bppathtemp = breakpoints[i].path.replace("/workspace/", "");
                            var bppath = bppathtemp.substring(0, bppathtemp.indexOf('/src/')) + "/";
                            if (bppath == pathtomake && breakpoints[i].enabled == true) {
                                var breakpointproperty = new Object();
                                breakpointproperty.filename = breakpoints[i].path.replace(/^.*\/(?=[^\/]*$)/, "");
                                breakpointproperty.line = breakpoints[i].line;
                                customBreakpoints.push(breakpointproperty);
                            }
                        }
                        /* Get variable entries in xml and extract the "embeddedvars" entries */
                        var xml = mdlEmbeddedDebug.getXml();
                        var varsxml = xml.getElementsByTagName("embeddedvars");
                        var varnames = new Array();
                        /* Get the debug variable names from the XML file */
                        for (var i = 0; i < varsxml.length; i++) {
                            varnames[i] = varsxml[i].getAttribute("name");
                        }
                        if (platform == "XMC4500" || platform == "TM4C1294XL") {
                            /* Check if the folder already exists */
                            fs.exists((ide.davPrefix + "/" + pathtomake + "bin/firmware.elf").replace(/\/+/, "/"), function (exists) {
                                if (exists) {
                                    embeddeddebugger.manageDebugcontrols(false, false, false, false, false);
                                    /* If we want to send something to our server plugin */
                                    var data = {
                                        command: "firmware",
                                        "path": pathtomake + "bin/firmware.elf",
                                        "operation": "debug",
                                        "breakpoints": customBreakpoints,
                                        "variables": varnames,
                                        "platform": platform,
                                        requireshandling: true
                                    };
                                    ide.send(data);

                                    ws.send("debug");
                                    ws.send("HW=" + platform);

                                }
                            });
                        }
                    }
                    /* Reset debug flag */
                    debug = 0;
                }

                /* Checks for the end of the compilation to run the C-Program */
                if (e.message.type == "npm-module-exit" && runstdc == 1) {
                    if (e.message.code == 0 && e.message.extra.original_line == ("make -C " + "/" + workspacedir + "/" + pathtomake + " all")) {
                        setTimeout(function () {
                            c9console.evalInputCommand("stdbuf -o L " + "/" + workspacedir + "/" + pathtomake + "bin/a.out " + params);
                            /* Reset run flag */
                            runstdc = 0;
                        }, 1000);
                    }
                    else runstdc = 0;
                }
                /* Checks for the end of the compilation to debug a C-Program */
                if (e.message.type == "npm-module-exit" && debugstdc == 1) {

                    if (e.message.code == 0 && e.message.extra.original_line == ("make -C " + "/" + workspacedir + "/" + pathtomake + " all")) {
                        customBreakpoints = new Array();
                        /* Get the breakpoints */
                        var breakpoints = embeddeddebugger.getBreakPoints();
                        /* Get current project path "root/project" */
                        pathtomake = path.substring(0, path.indexOf('/src/')) + "/";

                        /* Set the current make path to our debug path */
                        debugProjectPath = pathtomake;

                        /* loop through breakpoints to get the filename and line number of the bp */
                        for (var i = 0; i < breakpoints.length; i++) {
                            var bppathtemp = breakpoints[i].path.replace("/workspace/", "");
                            var bppath = bppathtemp.substring(0, bppathtemp.indexOf('/src/')) + "/";
                            if (bppath == pathtomake && breakpoints[i].enabled == true) {
                                var breakpointproperty = new Object();
                                /* Changed breakpointproperty["filename"] to breakpointproperty.filename, 126-127 09.04.2014, JH */
                                breakpointproperty.filename = breakpoints[i].path.replace(/^.*\/(?=[^\/]*$)/, "");
                                breakpointproperty.line = breakpoints[i].line;
                                customBreakpoints.push(breakpointproperty);
                            }
                        }
                        /* Get variable entries in xml and extract the "embeddedvars" entries */
                        var xml = mdlEmbeddedDebug.getXml();
                        var varsxml = xml.getElementsByTagName("embeddedvars");
                        var varnames = new Array();
                        /* Get the debug variable names from the XML file */
                        for (var i = 0; i < varsxml.length; i++) {
                            varnames[i] = varsxml[i].getAttribute("name");
                        }

                        /* Check if the folder already exists */
                        fs.exists((ide.davPrefix + "/" + pathtomake + "/bin/a.out").replace(/\/+/, "/"), function (exists) {
                            if (exists) {
                                embeddeddebugger.manageDebugcontrols(false, false, false, false, false);
                                /* If we want to send something to our server plugin */
                                var data = {
                                    command: "firmware",
                                    "path": pathtomake + "bin/a.out",
                                    "operation": "debugstdc",
                                    "breakpoints": customBreakpoints,
                                    "variables": varnames,
                                    "platform": "AMD64",
                                    "cmdparam": params,
                                    requireshandling: true
                                };
                                ide.send(data);
                                console.log("Sent debug request!");
                                //ws.send("debug");
                                //ws.send("HW="+platform);

                            }
                        });
                    }
                    /* Reset debug flag */
                    debugstdc = 0;
                }
            });


            /* Function that is used to compile and/or download */
            function compile(forceDownload, forceflash, forcedebug, debugstd, runstd) {

                /* Save changes */
                require("ext/save/save").saveall();

                /* Get th path to the makefile*/
                pathtomake = path.substring(0, path.indexOf('/src/')) + "/";

                /* Run the compilation */
                build(false, true);

                /* Set the operation flags for downloading, flashing or debugging */
                if (forceDownload == true) download = 1;
                else download = 0;

                if (forceflash == true) flash = 1;
                else flash = 0;

                if (forcedebug == true) debug = 1;
                else debug = 0;

                if (debugstd == true) debugstdc = 1;
                else debugstdc = 0;

                if (runstd == true) runstdc = 1;
                else runstdc = 0;
            }

            /* Function that is used to build the program */
            function build(clean, compile) {
                if (clean && !compile) c9console.evalInputCommand("make -C " + "/" + workspacedir + "/" + pathtomake + " clean");
                if (compile && !clean) c9console.evalInputCommand("make -C " + "/" + workspacedir + "/" + pathtomake + " all");
                if (clean && compile) c9console.evalInputCommand("make -C " + "/" + workspacedir + "/" + pathtomake + " clean && make -C " + pathtomake + " all");
            }

            /* Start Websocket client */
            function startwebsocketclient(websocketServerLocation) {

                if (targetSideButton != null && targetSideButton.caption != "Target-Side: Local") targetSideWsAddress = "ws://" + targetSideButton.caption.replace("Target-Side: ", "") + ":" + wsport + "/";
                else targetSideWsAddress = websocketServerLocation;

                ws = new WebSocket(targetSideWsAddress);
                var alivetimer;
                ws.onopen = function () {

                    /* Send the command for loading the previously used JLink GDB Server Path */
                    var data = {
                        command: "firmware",
                        "operation": "loadConfig",
                        "option": "JLink",
                        requireshandling: true
                    };
                    ide.send(data);
                    /* Send the command for loading the previously used OOCD Path */
                    data = {
                        command: "firmware",
                        "operation": "loadConfig",
                        "option": "OOCD",
                        requireshandling: true
                    };
                    ide.send(data);

                    websocketbutton.setIcon("wsconnect.png");

                    ws.send("IP=" + window.location.hostname);

                    /* Check if this is a page reload, so we do not transmit undefined values
                     * HW/Port is automatically retrieved at startup in this case */
                    if (platform != undefined || platform.indexOf("undefined") == -1) ws.send("HW=" + platform);

                    if (debugPort != undefined || debugPort.indexOf("undefined") == -1) ws.send("Port=" + debugPort);

                    ws.send("XMC4500-state");
                    ws.send("TM4C1294XL-state");

                    /* Try to connect to the debug-control service every minute (ms) */
                    alivetimer = window.setInterval(function () { ws.send("alive") }, 60000);
                };

                ws.onmessage = function (evt) {
                    /* Save the current JLink path in the config */
                    if (evt.data.indexOf("JLink:") != -1) {
                        /* Send request to store new path 
                         * of JLink executable */
                        var data = {
                            command: "firmware",
                            "operation": "saveConfigEntry",
                            "configEntry": evt.data,
                            requireshandling: true
                        };
                        ide.send(data);
                    }
                    /* Restart internal TCP server on server */
                    if (evt.data == "restart-redirection-server") {
                        /* Send request to restart all TCP servers */
                        var data = {
                            command: "firmware",
                            restartredirectionserver: true,
                            requireshandling: true
                        };
                        ide.send(data);
                    }
                    /* Enable debug controls and compile if connection error occurred */
                    if (evt.data == "DBGControlServiceOOCD-ready") {
                        if (isXMC4500Online == true && platform == "XMC4500") {

                            flashItem.enable();
                            debugItem.enable();
                        }
                        if (startDebuggerOOCD == true) {
                            compile(false, false, true, false, false);

                        }
                    }
                    /* Enable debug controls and compile if connection error occurred */
                    if (evt.data == "DBGControlServiceJLink-ready") {
                        if (isTM4C1294XLOnline == true && platform == "TM4C1294XL") {

                            flashItem.enable();
                            debugItem.enable();
                        }
                        if (startDebuggerJLink == true) {
                            compile(false, false, true, false, false);

                        }
                    }
                    /* Save new OpenOCD path to config*/
                    if (evt.data.indexOf("OOCD:") != -1) {
                        /* Send request to store new path 
                         * of OOCD executable */
                        var data = {
                            command: "firmware",
                            "operation": "saveConfigEntry",
                            "configEntry": evt.data,
                            requireshandling: true
                        };
                        ide.send(data);
                    }

                    /* Show error if a connection error from the server to the 
                     * embedded controller occured */
                    if (evt.data == "restart-required") {

                        _self.errormsg.setValue("The communication between the embedded controller <==> GDB server encountered a Problem!<br> The debug service is restarted automatically.");
                        _self.winEmbeddedDeveloper.setTitle("Error: Connection between HW <==> GDB server.");
                        _self.winEmbeddedDeveloper.show();
                    }

                    /* When development platform has been changed in DebugControlService */
                    if (evt.data == "xmc4500-selection-changed") {

                        itemXMC4500.select();
                        if (isXMC4500Online) hardwarebutton.setIcon("wsconnect.png");
                        else hardwarebutton.setIcon("wsdisconnect.png");
                        setDevelopmentPlatform("XMC4500");
                    }
                    /* When development platform has been changed in DebugControlService */
                    if (evt.data == "tm4c1294xl-selection-changed") {

                        itemTM4C1294XL.select();
                        if (isTM4C1294XLOnline) hardwarebutton.setIcon("wsconnect.png");
                        else hardwarebutton.setIcon("wsdisconnect.png");
                        setDevelopmentPlatform("TM4C1294XL");
                    }
                    /* A XMC4500 development board is available */
                    if (evt.data == "xmc4500-online") {

                        isXMC4500Online = true;
                        if (platform == "XMC4500") {
                            hardwarebutton.setIcon("wsconnect.png");
                            flashItem.enable();
                            debugItem.enable();
                        }
                    }
                    /* XMC4500 development board went offline */
                    if (evt.data == "xmc4500-offline") {

                        isXMC4500Online = false;
                        if (platform == "XMC4500") {
                            hardwarebutton.setIcon("wsdisconnect.png");
                            flashItem.disable();
                            debugItem.disable();
                        }
                    }
                    /* A TM4C1294XL development board is available */
                    if (evt.data == "tm4c1294xl-online") {

                        isTM4C1294XLOnline = true;
                        if (platform == "TM4C1294XL") {
                            hardwarebutton.setIcon("wsconnect.png");
                            flashItem.enable();
                            debugItem.enable();
                        }
                    }
                    /* TM4C1294XL development board went offline */
                    if (evt.data == "tm4c1294xl-offline") {

                        isTM4C1294XLOnline = false;
                        if (platform == "TM4C1294XL") {
                            hardwarebutton.setIcon("wsdisconnect.png");
                            flashItem.disable();
                            debugItem.disable();
                        }
                    }
                    /* Flash the development board */
                    if (evt.data == "flash") {

                        var data = {
                            command: "firmware",
                            "operation": "stop",
                            requireshandling: true
                        };
                        ide.send(data);
                        setTimeout(function () { compile(false, true, false, false, false) }, 1000);
                    }
                    /* Reset GDB connection, stop debugger */
                    if (evt.data == "reset-gdb") {
                        var data = {
                            command: "firmware",
                            "operation": "stop",
                            requireshandling: true
                        };
                        ide.send(data);
                    }
                    /* Debug the development board */
                    if (evt.data == "debug") {
                        var data = {
                            command: "firmware",
                            "operation": "stop",
                            requireshandling: true
                        };
                        ide.send(data);
                        setTimeout(function () { compile(false, false, true, false, false) }, 1000);
                    }
                };

                /* Websocket connection closed */
                ws.onclose = function () {

                    isTM4C1294XLOnline = false;
                    isXMC4500Online = false;
                    flashItem.disable();
                    debugItem.disable();
                    websocketbutton.setIcon("wsdisconnect.png");
                    hardwarebutton.setIcon("wsdisconnect.png");
                    window.clearInterval(alivetimer)

                    /* try to reconnect in 5 seconds */
                    setTimeout(function () { startwebsocketclient(websocketServerLocation) }, 3000);

                };

                ws.onerror = function (err) {
                    console.log("Websocket Error:" + err);
                };
            }


            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "build",
                hint: "Only build it",
                msg: "Building...",
                bindKey: { mac: "Cmd-1", win: "Ctrl-1" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    compile(false, false, false, false, false);
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "buildStdC",
                hint: "Only build C-Developer project",
                msg: "Building...",
                bindKey: { mac: "Ctrl-1", win: "Shift-Ctrl-1" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    compile(false, false, false, false, false);
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "compile",
                hint: "I'll compile it",
                msg: "Compiling...",
                bindKey: { mac: "Cmd-5", win: "Ctrl-5" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    compile(true, false, false, false, false);
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "flash",
                hint: "I'll flash it",
                msg: "Flashing...",
                bindKey: { mac: "Cmd-2", win: "Ctrl-2" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    if (flashItem.disabled == false) {
                        require("ext/embedded_debugger/embedded_debugger").embedded_stop(false);
                        setTimeout(function () { compile(false, true, false, false, false) }, 2000);
                    }
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "clean",
                hint: "I'll clean the project",
                msg: "Cleaning...",
                bindKey: { mac: "Cmd-4", win: "Ctrl-4" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    pathtomake = path.substring(0, path.indexOf('/src/')) + "/";
                    build(true, false);
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "cleanStdC",
                hint: "I'll clean the C-Developer project",
                msg: "Cleaning...",
                bindKey: { mac: "Ctrl-4", win: "Shift-Ctrl-4" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    pathtomake = path.substring(0, path.indexOf('/src/')) + "/";
                    build(true, false);
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "debug",
                hint: "I'll debug the project",
                msg: "Debugging...",
                bindKey: { mac: "Cmd-3", win: "Ctrl-3" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    if (debugItem.disabled == false) {
                        require("ext/embedded_debugger/embedded_debugger").embedded_stop(false);

                        if (startDebuggerOOCD == false && startDebuggerJLink == false && startStdDebugger == false) {
                            setTimeout(function () {
                                compile(false, false, true, false, false);

                                if (platform == "XMC4500") startDebuggerJLink = true;
                                if (platform == "TM4C1294XL") startDebuggerOOCD = true;

                            }, 2000);
                        }
                    }
                }
            });

            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "debugstdc",
                hint: "I'll debug the project",
                msg: "Debugging...",
                bindKey: { mac: "Ctrl-3", win: "Shift-Ctrl-3" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {

                    require("ext/embedded_debugger/embedded_debugger").embedded_stop(false);

                    if (startDebuggerOOCD == false && startDebuggerJLink == false && startStdDebugger == false) {
                        setTimeout(function () {
                            compile(false, false, false, true, false);

                            startStdDebugger = true;

                        }, 2000);
                    }

                }
            });

            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "runstdc",
                hint: "I'll run the program",
                msg: "Run...",
                bindKey: { mac: "Ctrl-2", win: "Shift-Ctrl-2" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    var data = {
                        command: "firmware",
                        "operation": "kill",
                        requireshandling: true
                    };
                    ide.send(data);

                    setTimeout(function () {
                        compile(false, false, false, false, true);
                    }, 1000);
                }
            });

            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "kill",
                hint: "I'll run the program",
                msg: "Kill...",
                bindKey: { mac: "Ctrl-5", win: "Shift-Ctrl-5" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {

                    var data = {
                        command: "firmware",
                        "operation": "kill",
                        requireshandling: true
                    };
                    ide.send(data);
                }
            });

            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "setparam",
                hint: "I'll run the program",
                msg: "Set parameters...",
                bindKey: { mac: "Ctrl-6", win: "Shift-Ctrl-6" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {

                    _self.winWithParam.show();
                }
            });
            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "XMC4500",
                hint: "Set XMC4500 development platform",
                msg: "XMC4500",
                /*bindKey: {mac: "Shift-5", win: "Ctrl-5"},*/
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    setDevelopmentPlatform("XMC4500");
                }
            });

            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "TM4C1294XL",
                hint: "Set TM4C1294XL development platform",
                msg: "TM4C1294XL",
                /*bindKey: {mac: "Shift-5", win: "Ctrl-5"},*/
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    setDevelopmentPlatform("TM4C1294XL");
                }
            });

            /* Command with information. Can e.g. executed by a menu item */
            commands.addCommand({
                name: "addtargetside",
                hint: "Add target side",
                msg: "Target side added",
                /*bindKey: {mac: "Shift-5", win: "Ctrl-5"},*/
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    _self.winTargetSide.show();
                }
            });



            /* Add the menu and it's sub menus to the IDE */
            this.nodes.push(
                menus.addItemByPath("Embedded Developer/", new apf.menu({
                    icon: "save.png"
                }), 200000)

            );

            /* Add the menu and it's sub menus to the IDE */
            this.nodes.push(
                menus.addItemByPath("C-Developer/", new apf.menu({
                    icon: "save.png"
                }), 190000)

            );
            /* Websocket status icon */
            menus.$insertByIndex(barExtras, websocketbutton = new apf.button({
                id: "btnWebsocket",
                icon: "wsdisconnect.png",
                skin: "c9-toolbarbutton-glossy",
                caption: "Debug-Control Service",
                command: "socketstatus",
            }), 3);
            /* Development platform status icon */
            menus.$insertByIndex(barExtras, hardwarebutton = new apf.button({
                id: "btnHardware",
                icon: "wsdisconnect.png",
                skin: "c9-toolbarbutton-glossy",
                caption: "Hardware",
                command: "hardwarestatus",
                visible: true,
            }), 1);
            /* Optional server port information */
            menus.$insertByIndex(barTools, buttonServerPort = new apf.button({
                id: "buttonServerPort",
                width: 100,
                skin: "c9-toolbarbutton-glossy",
                caption: "Port: N/A",
                visible: false,
            }), 101);

            /* Add dividers */
            menus.$insertByIndex(barExtras, separatorbegin = new apf.divider({ skin: "c9-divider" }), 0);
            menus.$insertByIndex(barExtras, separatormiddle = new apf.divider({ skin: "c9-divider" }), 2);

            /* Enable/Disable Noob config so a user can't change connection settings */
            function setNoobConf(option) {
                if (targetSideButton == null) {
                    menus.$insertByIndex(barTools, targetSideButton = new apf.button({
                        id: "buttonTargetSide",
                        width: 155,
                        skin: "c9-toolbarbutton-glossy",
                        caption: "Target-Side: Local",
                        command: "addtargetside",
                        visible: !option,
                    }), 100);
                    if (option) noob = 1;
                }
            }
            /* Initialize GUI elements & availability */
            function initPlatform(XMC4500, TM4C1294XL) {

                if (XMC4500 && noob != 1) {
                    menus.addItemByPath("Platform/", new apf.menu({
                        icon: "save.png"
                    }), 300000);
                    menus.addItemByPath("Platform/TM4C1294XL", itemTM4C1294XL = new apf.item({
                        id: "TM4C1294XL",
                        command: "TM4C1294XL",
                        type: "radio"
                    }), 100);
                    menus.addItemByPath("Platform/XMC4500", itemXMC4500 = new apf.item({
                        id: "XMC4500",
                        command: "XMC4500",
                        type: "radio",
                        selected: "true"
                    }), 200);
                }
                if (XMC4500 && noob == 1) {

                    itemTM4C1294XL = new apf.item({
                        id: "TM4C1294XL",
                        command: "TM4C1294XL",
                        type: "radio"
                    });
                    itemXMC4500 = new apf.item({
                        id: "XMC4500",
                        command: "XMC4500",
                        type: "radio",
                        selected: "true"
                    });
                }
                if (TM4C1294XL && noob != 1) {
                    menus.addItemByPath("Platform/", new apf.menu({
                        icon: "save.png"
                    }), 300000);
                    menus.addItemByPath("Platform/TM4C1294XL", itemTM4C1294XL = new apf.item({
                        id: "TM4C1294XL",
                        command: "TM4C1294XL",
                        type: "radio",
                        selected: "true"
                    }), 100);
                    menus.addItemByPath("Platform/XMC4500", itemXMC4500 = new apf.item({
                        id: "XMC4500",
                        command: "XMC4500",
                        type: "radio"
                    }), 200);
                }
                if (TM4C1294XL && noob == 1) {

                    itemTM4C1294XL = new apf.item({
                        id: "TM4C1294XL",
                        command: "TM4C1294XL",
                        type: "radio",
                        selected: "true",
                        visible: "false"
                    });
                    itemXMC4500 = new apf.item({
                        id: "XMC4500",
                        command: "XMC4500",
                        type: "radio",
                        visible: "false"
                    });
                }
            }

            /* Add Embedded Developer menu */
            menus.addItemByPath("Embedded Developer/Build", new apf.item({
                command: "build",
                icon: "console_settings.png"
            }), 100);
            menus.addItemByPath("Embedded Developer/Flash", flashItem = new apf.item({
                command: "flash",
                icon: "page_white_flash.png"
            }), 200);
            menus.addItemByPath("Embedded Developer/Debug", debugItem = new apf.item({
                command: "debug",
                icon: "debugger/ldebug_obj.png"
            }), 300);
            menus.addItemByPath("Embedded Developer/Clean", new apf.item({
                command: "clean",
                icon: "console_clear.png"
            }), 400);
            menus.addItemByPath("Embedded Developer/Download", new apf.item({
                command: "compile",
                icon: "save.png"
            }), 500);

            /* Disable flash/debug items by default */
            debugItem.disable();
            flashItem.disable();

            /* Add C-Developer menu */
            menus.addItemByPath("C-Developer/Build", new apf.item({
                command: "buildStdC",
                icon: "console_settings.png"
            }), 100);
            menus.addItemByPath("C-Developer/Run", new apf.item({
                command: "runstdc",
                icon: "run.png"
            }), 200);
            menus.addItemByPath("C-Developer/Debug", new apf.item({
                command: "debugstdc",
                icon: "debugger/ldebug_obj.png"
            }), 300);
            menus.addItemByPath("C-Developer/Clean", new apf.item({
                command: "cleanStdC",
                icon: "console_clear.png"
            }), 400);
            menus.addItemByPath("C-Developer/Kill running processes", new apf.item({
                command: "kill",
                icon: "debugger/delete_config.gif"
            }), 500);
            menus.addItemByPath("C-Developer/Set cmdline parameter", new apf.item({
                command: "setparam",
                icon: "terminal_tab_icon.png"
            }), 600);
            /* Sets 2 variables, One with the path to the active file and another for the generated object file name
             * Always retrieves the properties of the currently active file */
            function setActiveFile(page) {
                if (page && page.$model && page.$doc.getNode().getAttribute("ignore") !== "1") {
                    var prefixRegex = new RegExp("^" + ide.davPrefix);
                    var oldPathToMake = pathtomake;
                    pathTemp = page.$model.data.getAttribute("path").replace(prefixRegex, "");
                    console.log(pathTemp);
                    /* Delete first "/" */
                    path = pathTemp.replace("/", "");

                    /* Set path to make */
                    pathtomake = path.substring(0, path.indexOf('/src/')) + "/";

                    /* Replaces everything frmo the beginning to the last "/" */
                    objectFileNameWithSuffix = pathTemp.replace(/^.*\/(?=[^\/]*$)/, '');

                    /* Replaces the "." and the following characters */
                    objectFileName = objectFileNameWithSuffix.replace(/\..*/, '');

                    /* Replace the filename in the source folder to get the sourcefolder path */
                    sourceFolderPath = path.replace(objectFileNameWithSuffix, "");

                    if (oldPathToMake != pathtomake) {

                        _self.removeAllTargetSides();

                        /* Get the breakpoints */
                        var breakpoints = embeddeddebugger.getBreakPoints();

                        /* loop through breakpoints to get the filename and line number of the bp */
                        for (var i = 0; i < breakpoints.length; i++) {
                            stddbg.removeBreakpointFromGrid(breakpoints[i].path, breakpoints[i].line - 1);
                        }

                        /* Send request for restoring the breakpoints */
                        var data = {
                            command: "firmware",
                            "operation": "recoverBreakpoints",
                            "path": pathtomake,
                            requireshandling: true
                        };
                        ide.send(data);

                        require("ext/embedded_debugger/embedded_debugger").removeEmbeddedDebugVariablesFromView();

                        /* Send request for restoring the debug variables */
                        data = {
                            command: "firmware",
                            "operation": "recoverDebugVariables",
                            "path": pathtomake,
                            requireshandling: true
                        };
                        ide.send(data);

                        /* Send request for restoring the debug configuration */
                        data = {
                            command: "firmware",
                            "operation": "recoverDebugconfiguration",
                            requireshandling: true
                        };
                        ide.send(data);

                        /* Send the command for loading the previously used Target Side*/
                        data = {
                            command: "firmware",
                            "operation": "loadConfig",
                            "option": "ActiveTargetSideAddress",
                            requireshandling: true
                        };
                        ide.send(data);

                        /* Send the command for loading the address*/
                        data = {
                            command: "firmware",
                            "operation": "loadConfig",
                            "option": "TargetSideAddresses",
                            requireshandling: true
                        };
                        ide.send(data);

                        /* Send request for restoring websocket port */
                        data = {
                            command: "firmware",
                            "publicwsport": true,
                            requireshandling: true
                        };
                        ide.send(data);

                        /* Update analysis settings */
                        require("ext/embedded_analysis/embedded_analysis").initAnalysisSettings();
                    }
                }
            }
            /* Triggers all necessary events when the development platform has changed
             * in software or IDE */
            function setDevelopmentPlatform(device) {

                if (device == "TM4C1294XL") {
                    /* Enable/Disable debug controls */
                    if (isTM4C1294XLOnline == true) {
                        flashItem.enable();
                        debugItem.enable();
                    }
                    else {
                        flashItem.disable();
                        debugItem.disable();
                    }
                    //require("ext/embedded_debugger/embedded_debugger").embedded_stop(false);
                    /* Load debug configuration */
                    platform = "TM4C1294XL";
                    var data = {
                        command: "firmware",
                        "operation": "debugconf",
                        "platform": platform,
                        requireshandling: true
                    };
                    ide.send(data);
                    /* Tell the debug-control service */
                    ws.send("HW=" + platform);
                }
                if (device == "XMC4500") {
                    /* Enable/Disable debug controls */
                    if (isXMC4500Online == true) {
                        flashItem.enable();
                        debugItem.enable();
                    }
                    else {
                        flashItem.disable();
                        debugItem.disable();
                    }
                    //require("ext/embedded_debugger/embedded_debugger").embedded_stop(false);
                    /* Load debug configuration */
                    platform = "XMC4500";
                    var data = {
                        command: "firmware",
                        "operation": "debugconf",
                        "platform": "XMC4500",
                        requireshandling: true
                    };
                    ide.send(data);
                    /* Tell the debug-control service */
                    ws.send("HW=" + platform);
                }
            }
            /* Register Event listener for getting the always active file */
            ide.addEventListener("init.ext/editors/editors", function (e) {
                setActiveFile(tabEditors.getPage());

                ide.addEventListener("tab.afterswitch", function (e) {
                    setActiveFile(e.nextPage);
                });

                ide.addEventListener("updatefile", function (e) {
                    setActiveFile(tabEditors.getPage());
                });

            });
            /* Register Event listener for the Clear button because it does not clear 
             * text inserted by the programmer via the c9console.log() command */
            btnConsoleClear.addEventListener("click", function (e) {
                txtConsole.clear();

            });

        },
        /* hook function (optional) Is called when extension registers itself. When defined use "ext.initExtension(this);" to register extension */
        hook: function () {
            var _self = this;
            ext.initExtension(this);
        },
        /* Required: Used when enabled/disabled from windows menu */
        enable: function () {
            this.nodes.each(function (item) {
                item.enable();
            });
        },

        disable: function () {
            this.nodes.each(function (item) {
                item.disable();
            });
        },
        /* Required: Used when disabled in the extension manager */
        destroy: function () {
            this.nodes.each(function (item) {
                item.destroy(true, true);
            });
            this.nodes = [];
        },

        /* Function that simply closes the embedded developer window */
        closeEmbeddedDeveloperWindow: function () {
            this.winEmbeddedDeveloper.hide();
        },
        /* Function that simply closes the target-side window and saves changes
         * to server config */
        closeTargetSideWindow: function () {
            buttonTargetSide.setCaption("Target-Side: " + activeWebSocket.label);
            var data = {
                command: "firmware",
                "operation": "saveConfigEntry",
                "configEntry": "ActiveTargetSideAddress:" + activeWebSocket.label,
                requireshandling: true
            };
            ide.send(data);
            /* Close websocket server */
            ws.close();
            this.winTargetSide.hide();
        },

        /* Function that adds target sides */
        addTargetSide: function (ip, selected) {
            if (ip != "") {
                var rbLocal = new apf.radiobutton({
                    group: "targetSides",
                    skin: "radio_grey",
                    label: ip,
                    //value : ip,
                    selected: false
                });
                /* Check if the rdbtn shall be selected when added */
                if (selected == true) {
                    rbLocal.selected = true;
                    activeWebSocket = rbLocal;
                }
                /* Local should always be available */
                if (ip == "Local") {
                    rbLocal.selected = true;
                    activeWebSocket = rbLocal;
                    localWebSocket = rbLocal;
                }
                /* Register Event listener for the onClick of the rdbtn */
                rbLocal.addEventListener("click", function (e) {
                    rbLocal.selected = true;
                    activeWebSocket = rbLocal;
                });
                var matching = false;
                for (index = 0; index < webSocketArray.length; index++) {
                    if (webSocketArray[index] == ip) matching = true;
                }
                /* Add the button */
                if (matching == false) {
                    if (ip != "Local") webSocketArray.push(ip);
                    if (ip != "Local") apfWebSocketArray.push(rbLocal);
                    menus.$insertByIndex(vBoxIP, rbLocal, 1);
                    //activeWebSocket = rbLocal;
                }
            }
            this.winWebsocketIP.hide();
            /* Save the newly added IP address */
            if (ip != "Local") {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "TargetSideAddresses:" + webSocketArray.toString(),
                    requireshandling: true
                };
                ide.send(data);

            }
        },
        /* Function that removes a target side */
        removeTargetSide: function () {
            //if(activeWebSocket.label != "Local")
            for (index = 0; index < webSocketArray.length; index++) {
                if (webSocketArray[index] == activeWebSocket.label && activeWebSocket.label != "Local") {
                    webSocketArray.splice(index, 1);
                    activeWebSocket.removeNode();
                }
            }
            /* Remove/send updated ip addresses to server */
            var data = {
                command: "firmware",
                "operation": "saveConfigEntry",
                "configEntry": "TargetSideAddresses:" + webSocketArray.toString(),
                requireshandling: true
            };
            ide.send(data);

        },
        /* Function that removes all target sides */
        removeAllTargetSides: function () {
            activeWebSocket = localWebSocket;
            localWebSocket.select();
            for (index = 0; index < apfWebSocketArray.length; index++) {
                webSocketArray.splice(index, 1);
                apfWebSocketArray[index].removeNode();
                apfWebSocketArray.splice(index, 1);
            }
        },
        /* Function that returns the current makefile path */
        getMakefilePath: function () {
            return pathtomake;
        },
        /* Function that returns the current debug context */
        getDebugPath: function () {
            return debugProjectPath;
        },
        /* Function that sets debugger contexts on stop */
        setDebuggerStopped: function () {
            startDebuggerOOCD = false;
            startDebuggerJLink = false;
            startStdDebugger = false;
        },
        /* Function that sets a (std) C program's cmdline arguments */
        setStdCProgramParams: function (param) {
            params = param.trim().split(/\s+/);
            this.winWithParam.hide();
        },
        /* Function that returns the current initial breakpoints */
        getInitialbreakpoints: function (argument) {
            return customBreakpoints;
        },
        /* Get the time and date for log outputs */
        getDateTime: function () {

            var date = new Date();

            var hour = date.getHours();
            hour = (hour < 10 ? "0" : "") + hour;

            var min = date.getMinutes();
            min = (min < 10 ? "0" : "") + min;

            var sec = date.getSeconds();
            sec = (sec < 10 ? "0" : "") + sec;

            var year = date.getFullYear();

            var month = date.getMonth() + 1;
            month = (month < 10 ? "0" : "") + month;

            var day = date.getDate();
            day = (day < 10 ? "0" : "") + day;

            return year + "-" + month + "-" + day + "-" + hour + ":" + min + ":" + sec;
        },
        onBeforeUnloadHandler: function () {
            /* Kill running C-programs and send information on disconnect to the server */
            var data = {
                command: "firmware",
                "operation": "kill",
                "logging": "User disconnected!",
                requireshandling: true
            };
            ide.send(data);
            /* Send request to restart all TCP servers */
            data = {
                command: "firmware",
                restartredirectionserver: true,
                requireshandling: true
            };
            ide.send(data);
        }
    });

});
