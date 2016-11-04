/**
 * Embedded Analysis Plugin for Cloud9 IDE
 * 
 * Is used to manage the analysis tools for WCET analysis
 * or static code analysis
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
    var fs = require("ext/filesystem/filesystem");
    var markup = require("text!ext/embedded_analysis/embedded_analysis.xml");

    var analysisScriptPath;

    /* Begin declaring module */
    module.exports = ext.register("ext/embedded_analysis/embedded_analysis", {
        name: "Embedded Analysis",
        dev: "SAT",
        alone: true,
        deps: [],
        type: ext.GENERAL,
        markup: markup,

        nodes: [],

        /* Init function (required) */
        init: function () {
            var _self = this;
            this.winEmbeddedAnalysis = winEmbeddedAnalysis;
            this.winConfigEmbeddedAnalysis = winConfigEmbeddedAnalysis;
            this.errormsgembeddedanalysis = errormsgembeddedanalysis;
            this.txtBoxSources = txtBoxSources;
            this.txtBoxIncludes = txtBoxIncludes;
            this.txtBoxFlowfacts = txtBoxFlowfacts;
            this.chkDisplayWCET = chkDisplayWCET;
            this.chkDisplayStack = chkDisplayStack;
            this.chksoaricfg = chksoaricfg;
            this.chkDisplayBBS = chkDisplayBBS;
            this.chkCreateCFG = chkCreateCFG;
            this.rbBBStatisticOff = rbBBStatisticOff;
            this.rbBBStatisticNormal = rbBBStatisticNormal;
            this.rbBBStatisticAdvanced = rbBBStatisticAdvanced;
            this.ddScripts = ddScripts;
            this.ddcfgOutput = ddcfgOutput;
            this.dgFunctions = dgFunctions;
            this.errormsgembeddedanalysis = errormsgembeddedanalysis;

            _self.initAnalysisSettings();

            /* Register Event listener when analysis script selection has changed to save the configuration on-the-fly */
            ddScripts.addEventListener("afterselect", function (e) {
                /* Send command to load analysis sources */
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "AnalysisScript:" + ddScripts.value,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Register Event listener when CFG output selection has changed to save the configuration on-the-fly */
            ddcfgOutput.addEventListener("afterselect", function (e) {
                /* Send command to load analysis sources */
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "CFGOutput:" + ddcfgOutput.value,
                    requireshandling: true
                };
                ide.send(data);
                if (ddcfgOutput.value == "off") chksoaricfg.disable();
                else chksoaricfg.enable();
            });

            /* Register Event listener for the keyup event to save the configuration on-the-fly */
            txtBoxSources.addEventListener("keyup", function (e) {
                /* Send command to load analysis sources */
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "ASources:" + txtBoxSources.getValue(),
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Register Event listener for the keyup event to save the configuration on-the-fly */
            txtBoxIncludes.addEventListener("keyup", function (e) {
                /* Send command to load analysis includes */
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "AIncludes:" + txtBoxIncludes.getValue(),
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Register Event listener for the keyup event */
            txtBoxFlowfacts.addEventListener("keyup", function (e) {
                /* Send command to load flowfacts */
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "Flowfacts:" + txtBoxFlowfacts.getValue(),
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Checkbox Event listener */
            chkDisplayWCET.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "DisplayWCET:" + chkDisplayWCET.checked,
                    requireshandling: true
                };
                ide.send(data);


            });

            /* Checkbox Event listener */
            chkDisplayStack.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "DisplayStack:" + chkDisplayStack.checked,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Checkbox Event listener */
            chksoaricfg.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "SOARICFG:" + chksoaricfg.checked,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Checkbox Event listener */
            chkDisplayBBS.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "DisplayBBStatistic:" + chkDisplayBBS.checked,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Checkbox Event listener */
            chkCreateCFG.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "CreateCFG:" + chkCreateCFG.checked,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Radio button Event listener */
            rbBBStatisticOff.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "BBStatistic:" + rbBBStatisticOff.value,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Radio button Event listener */
            rbBBStatisticNormal.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "BBStatistic:" + rbBBStatisticNormal.value,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Radio button Event listener */
            rbBBStatisticAdvanced.addEventListener("click", function (e) {
                var data = {
                    command: "firmware",
                    "operation": "saveConfigEntry",
                    "configEntry": "BBStatistic:" + rbBBStatisticAdvanced.value,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* EventListener for the compile finnished message */
            ide.addEventListener("socketMessage", function (e) {

                /* Gets the result about the analysis functions */
                if (e.message.type == "result" && e.message.subtype[0] == "loadAnalysisFunctions") {
                    var analysisfunctions = e.message.subtype[1]

                    /* Initialize model */
                    mdlEmbeddedAnalysis.load('<data>\
                </data>');

                    /* Loop through received functions and add them to the model */
                    for (var i = 0; i < analysisfunctions.length; i++) {
                        if (analysisfunctions[i] != "") mdlEmbeddedAnalysis.appendXml('<embeddedfunctions name="' + analysisfunctions[i] + '"></embeddedfunctions>');
                    }
                }

                /* Gets the result about the analysis sources */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigASources") {
                    txtBoxSources.setValue(e.message.subtype[1].split(":")[1]);
                }
                /* Gets the result about the analysis includes */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigAIncludes") {
                    txtBoxIncludes.setValue(e.message.subtype[1].split(":")[1]);
                }
                /* Gets the result about the flowfacts */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigFlowfacts") {
                    txtBoxFlowfacts.setValue(e.message.subtype[1].split(":")[1]);
                }
                /* Gets the result about the WCET representation */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigDisplayWCET") {
                    if (e.message.subtype[1].split(":")[1] == "true") chkDisplayWCET.check();
                    else chkDisplayWCET.uncheck();
                }
                /* Gets the result about the stack representation */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigDisplayStack") {
                    if (e.message.subtype[1].split(":")[1] == "true") chkDisplayStack.check();
                    else chkDisplayStack.uncheck();
                }
                /* Gets the result about the SOARICFG */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigSOARICFG") {
                    if (e.message.subtype[1].split(":")[1] == "true") chksoaricfg.check();
                    else chksoaricfg.uncheck();
                }
                /* Gets the result about the Basic Block Statistics representation */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigDisplayBBStatistic") {
                    if (e.message.subtype[1].split(":")[1] == "true") chkDisplayBBS.check();
                    else chkDisplayBBS.uncheck();
                }
                /* Gets the result about the CFG creation option */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigCreateCFG") {
                    if (e.message.subtype[1].split(":")[1] == "true") chkCreateCFG.check();
                    else chkCreateCFG.uncheck();
                }
                /* Gets the result the Basic Block Statistics config */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigBBStatistics") {
                    if (e.message.subtype[1].split(":")[1] == "normal") rbBBStatisticnormal.select();
                    else if (e.message.subtype[1].split(":")[1] == "advanced") rbBBStatisticAdvanced.select();
                    else rbBBStatisticOff.select();
                }

                /* Gets the result about the analysis script */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigAnalysisScript") {
                    ddScripts.select(e.message.subtype[1].split(":")[1]);
                }

                /* Gets the result about the analysis CFG output */
                if (e.message.type == "result" && e.message.subtype[0] == "loadConfigCFGOutput") {
                    ddcfgOutput.select(e.message.subtype[1].split(":")[1]);
                    if (e.message.subtype[1].split(":")[1] == "off") chksoaricfg.disable();
                    else chksoaricfg.enable();
                }

                /* Gets the result about the available analysis scripts */
                if (e.message.type == "result" && e.message.subtype[0] == "availableScripts") {
                    var scripts = e.message.subtype[1];
                    /* Initialize model */
                    mdlScripts.load('<data>\
                </data>');
                    for (var i = 0; i < scripts.length; i++) {
                        mdlScripts.appendXml('<element caption="' + scripts[i] + '" value="' + scripts[i] + '"></element>');
                    }
                    /* Send the command for loading the analysis sources */
                    var data = {
                        command: "firmware",
                        "operation": "loadConfig",
                        "option": "AnalysisScript",
                        requireshandling: true
                    };
                    ide.send(data);

                }
            });

            /* Command for generating Flow Facts */
            commands.addCommand({
                name: "generateFlowFacts",
                hint: "Generate Flow Facts",
                msg: "Generating FF...",
                bindKey: { mac: "Cmd-6", win: "Ctrl-6" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {

                    /* Get th path to the analysis scripts*/
                    analysisScriptPath = require("ext/embedded_developer/embedded_developer").getMakefilePath();

                    /* Check if the ELF file exists */
                    fs.exists((ide.davPrefix + "/" + analysisScriptPath + "bin/firmware.elf").replace(/\/+/, "/"), function (exists) {
                        if (exists) {
                            var sources = txtBoxSources.getValue();
                            var includes = txtBoxIncludes.getValue();
                            var ff = txtBoxFlowfacts.getValue();

                            /* Get xml representation of all functions */
                            var xml = mdlEmbeddedAnalysis.getXml();
                            var varsxml = xml.getElementsByTagName("embeddedfunctions");
                            var functions = "";

                            for (var i = 0; i < varsxml.length; i++) {
                                functions = functions + " " + varsxml[i].attributes[0].nodeValue;
                            }
                            /* Create analysis folder and generate flow facts*/
                            c9console.evalInputCommand("sh -c 'mkdir " + ide.workspaceDir + "/" + analysisScriptPath + "analysis; cd " + ide.workspaceDir + "/" + analysisScriptPath + "analysis && mkffx ../bin/firmware.elf " + sources + " " + includes + " -f " + ff + " -r " + functions + "'");
                        }
                        else {
                            _self.errormsgembeddedanalysis.setValue("No firmware.elf file found in the bin folder!<br> Please compile the program and make sure the file exists.");
                            _self.winEmbeddedAnalysis.setTitle("Error: Firmware not found");
                            _self.winEmbeddedAnalysis.show();
                        }
                    });
                }
            });
            /* Command for analysing WCET */
            commands.addCommand({
                name: "analyse",
                hint: "Analyse",
                msg: "Analysing ...",
                bindKey: { mac: "Cmd-7", win: "Ctrl-7" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {
                    /* Get th path to the analysis scripts*/
                    analysisScriptPath = require("ext/embedded_developer/embedded_developer").getMakefilePath();
                    /* Check if the ELF file exists */
                    fs.exists((ide.davPrefix + "/" + analysisScriptPath + "bin/firmware.elf").replace(/\/+/, "/"), function (exists) {
                        if (exists) {
                            var script = "/usr/local/share/Otawa/scripts/" + ddScripts.value;
                            var ff = txtBoxFlowfacts.getValue();
                            var cfgOutFormat = ddcfgOutput.value;

                            /* Get xml representation of all functions */
                            var xml = mdlEmbeddedAnalysis.getXml();
                            var varsxml = xml.getElementsByTagName("embeddedfunctions");
                            var functions = "";
                            var params = "";

                            /* Evaluate analysis settings */
                            if (chkDisplayWCET.checked) params = params + "--wcet";
                            if (chkDisplayStack.checked) params = params + " --stack";
                            if (chksoaricfg.checked && !chksoaricfg.disabled) params = params + " --cfg-only-prop";
                            if (!chksoaricfg.checked && !chksoaricfg.disabled) params = params + " --cfg-prop";
                            if (rbBBStatisticNormal.selected) params = params + " --bbtimes";
                            if (rbBBStatisticAdvanced.selected) params = params + " --bbtimes-all";

                            /* Run analysis */
                            for (var i = 0; i < varsxml.length; i++) {
                                functions = varsxml[i].attributes[0].nodeValue;
                                if (cfgOutFormat == "dot(interactive)") c9console.evalInputCommand("sh -c 'cd " + ide.workspaceDir + "/" + analysisScriptPath + "analysis && oswa ../bin/firmware.elf -s " + script + " -f " + ff + " " + functions + " --cfg dot --cfg-path ../bin " + params + " && dot2json.py -i ../bin/" + functions + ".dot -o ../bin/" + functions + ".cfg.html -c -d /usr/bin/dot2json/dep/ -s ../src/ -j ../bin/" + functions + ".json'");
                                else if (cfgOutFormat == "off") c9console.evalInputCommand("sh -c 'cd " + ide.workspaceDir + "/" + analysisScriptPath + "analysis && oswa ../bin/firmware.elf -s " + script + " -f " + ff + " " + functions + " " + params + "'");
                                else c9console.evalInputCommand("sh -c 'cd " + ide.workspaceDir + "/" + analysisScriptPath + "analysis && oswa ../bin/firmware.elf -s " + script + " -f " + ff + " " + functions + " --cfg " + cfgOutFormat + " --cfg-path ../bin " + params + "'");
                            }
                        }
                        else {
                            _self.errormsgembeddedanalysis.setValue("No firmware.elf file found in the bin folder!<br> Please compile the program and make sure the file exists.");
                            _self.winEmbeddedAnalysis.setTitle("Error: Firmware not found");
                            _self.winEmbeddedAnalysis.show();
                        }
                    });
                }
            });

            /* Command for analysing WCSA */
            commands.addCommand({
                name: "configureAnalysis",
                hint: "Configure Analysis",
                msg: "Configuring Analysis ...",
                bindKey: { mac: "Cmd-8", win: "Ctrl-8" },
                isAvailable: function () {
                    return true;
                },
                /* Function that declares the onClick behaviour */
                exec: function () {

                    /* Init analysis settings and show window */
                    _self.initAnalysisSettings();
                    _self.winConfigEmbeddedAnalysis.show();
                }
            });

            /* Add the analysis menu and it's sub menus to the IDE */
            this.nodes.push(
                menus.addItemByPath("Embedded Analysis/", new apf.menu({
                }), 210000)
            );
            menus.addItemByPath("Embedded Analysis/Generate Flow Facts", new apf.item({
                command: "generateFlowFacts",
                icon: "console_settings.png"
            }), 100);
            menus.addItemByPath("Embedded Analysis/Analyse", new apf.item({
                command: "analyse",
                icon: "run.png"
            }), 200);
            menus.addItemByPath("Embedded Analysis/Configure Analysis", new apf.item({
                command: "configureAnalysis"
            }), 300);

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
        /* Required: Used when diabled in the extension manager */
        destroy: function () {
            this.nodes.each(function (item) {
                item.destroy(true, true);
            });
            this.nodes = [];
        },

        /* Function that simply closes the window */
        closeWindow: function () {
            this.winEmbeddedAnalysis.hide();
        },

        /* Adds functions to the analysis settings */
        addFunction: function () {

            var xml = mdlEmbeddedAnalysis.getXml();
            var vars = xml.getElementsByTagName("embeddedfunctions");
            /* Flag when an entry matches */
            var matching = false;
            for (var i = 0; i < vars.length; i++) {
                /* Check for duplicate entries. */
                if (vars[i].getAttribute("name") == txtBoxFunctions.value.trim()) matching = true;
            }
            /* If there was no match, send the new function to the server and append it to the current datagrid model */
            if (txtBoxFunctions.value.trim() != "" && matching == false) {
                /* Append the function to the model */
                mdlEmbeddedAnalysis.appendXml('<embeddedfunctions name="' + txtBoxFunctions.value.trim() + '"></embeddedfunctions>');
                /* Save the function on the server */
                data = {
                    command: "firmware",
                    "operation": "saveAnalysisFunction",
                    "analysisFunctionToSave": txtBoxFunctions.value.trim(),
                    requireshandling: true
                };
                ide.send(data);
            }
        },

        /* Removes a function from the view and the config file to not show anymore */
        removeFunction: function () {
            mdlEmbeddedAnalysis.removeXml(dgFunctions.getSelection()[0]);
            var data = {
                command: "firmware",
                "operation": "removeAnalysisFunction",
                "analysisFunctionToDelete": dgFunctions.getSelection()[0].getAttribute("name"),
                requireshandling: true
            };
            ide.send(data);
        },

        /* Removes a function from the view and the config file to not show anymore */
        initAnalysisSettings: function () {
            /* Send the command to scan for load analysis functions */
            var data = {
                command: "firmware",
                "operation": "recoverAnalysisFunctions",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command to scan for analysis scripts (.osx) */
            var data = {
                command: "firmware",
                "operation": "scanForAnalysisScripts",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading the analysis CFG output */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "CFGOutput",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading the analysis sources */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "ASources",
                requireshandling: true
            };
            ide.send(data);
            /* Send the command for loading the analysis includes */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "AIncludes",
                requireshandling: true
            };
            ide.send(data);
            /* Send the command for loading the flowfacts */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "Flowfacts",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading checked options */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "DisplayWCET",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading checked options */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "DisplayStack",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading checked options */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "SOARICFG",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading checked options */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "DisplayBBStatistic",
                requireshandling: true
            };
            ide.send(data);

            /* Send the command for loading checked options */
            var data = {
                command: "firmware",
                "operation": "loadConfig",
                "option": "CreateCFG",
                requireshandling: true
            };
            ide.send(data);
        },
        /* Function that simply closes the hello world window */
        closeEmbeddedAnalysisWindow: function () {
            this.winEmbeddedAnalysis.hide();
        },

    });

});
