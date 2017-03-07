/**
 * Debugger for Embedded Hardware for the Cloud9 IDE
 *
 * @author Jürgen Hausladen
 * @copyright 2016, SAT, FH Technikum Wien
 * @license AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

define(function (require, exports, module) {

    require("apf/elements/codeeditor");

    var ide = require("core/ide");
    var ext = require("core/ext");
    var dock = require("ext/dockpanel/dockpanel");
    var commands = require("ext/commands/commands");
    var fs = require("ext/filesystem/filesystem");
    var markup = require("text!ext/embedded_debugger/embedded_debugger.xml");
    var rev = require("ext/revisions/revisions_util");
    var sources = require("ext/debugger/sources");
    var c9console = require("ext/console/console");
    var editors = require("ext/editors/editors");
    var path, row;
    /* global dbInteractive txtCode dbg
     * dbgVariable pgDebugNav tabDebug dgVars*/

    module.exports = ext.register("ext/embedded_debugger/embedded_debugger", {
        name: "Embedded Debug",
        dev: "SAT",
        type: ext.GENERAL,
        alone: true,
        offline: false,
        autodisable: ext.ONLINE | ext.LOCAL,
        markup: markup,
        buttonClassName: "debug1",
        deps: [fs],

        nodesAll: [],
        nodes: [],
        handlers: [],

        hook: function () {
            var _self = this;

            /* Resume HW */
            commands.addCommand({
                name: "embeddedresume",
                hint: "resume the current paused process",
                bindKey: { mac: "Shift-F8", win: "Ctrl-F8" },
                exec: function () {
                    _self.embedded_resume();
                }
            });
            /* Suspend HW */
            commands.addCommand({
                name: "embeddedsuspend",
                hint: "suspend the current paused process",
                bindKey: { mac: "Shift-F9", win: "Ctrl-F9" },
                exec: function () {
                    _self.embedded_suspend();
                }
            });
            /* Stepinto HW */
            commands.addCommand({
                name: "embeddedstepinto",
                hint: "step into the function that is next on the execution stack",
                bindKey: { mac: "Shift-F11", win: "Ctrl-F11" },
                exec: function () {
                    _self.embedded_resume("in");
                }
            });
            /* Stepover HW */
            commands.addCommand({
                name: "embeddedstepover",
                hint: "step over the current expression on the execution stack",
                bindKey: { mac: "Shift-F10", win: "Ctrl-F10" },
                exec: function () {
                    _self.embedded_resume("next");
                }
            });
            /* Stepout HW */
            commands.addCommand({
                name: "embeddedstepout",
                hint: "step out of the current function scope",
                bindKey: { mac: "Shift-F12", win: "Ctrl-F12" },
                exec: function () {
                    _self.embedded_resume("out");
                }
            });
            /* Stop HW */
            commands.addCommand({
                name: "embeddedstop",
                hint: "stop the debugging process",
                bindKey: { mac: "Shift-F7", win: "Ctrl-F7" },
                exec: function () {
                    _self.embedded_stop(true);
                }
            });


            var name = "ext/embedded_debugger/embedded_debugger";
            /* Add Dock buttons */
            dock.addDockable({
                expanded: -1,
                width: 300,
                sections: [
                    {
                        height: 30,
                        width: 150,
                        minHeight: 30,
                        noflex: true,
                        draggable: false,
                        resizable: false,
                        skin: "dockwin_runbtns",
                        noTab: true,
                        position: 1,

                        buttons: [{
                            id: "btnEmbeddedRunCommands",
                            caption: "Run Commands",
                            "class": "btn-runcommands",
                            ext: [name, "pgEmbeddedDebugNav"],
                            draggable: false,
                            hidden: true
                        }]
                    },
                    {
                        width: 380,
                        height: 300,
                        flex: 3,
                        buttons: [
                            { caption: "Variables", ext: [name, "dbgEmbeddedVariable"], hidden: true }
                        ]
                    }

                ]
            });
            /* Register dock panels */
            dock.register(name, "pgEmbeddedDebugNav", {
                menu: "Debugger",
                primary: {
                    backgroundImage: ide.staticPrefix + "/ext/main/style/images/debugicons.png",
                    defaultState: { x: -6, y: -265 },
                    activeState: { x: -6, y: -265 }
                }
            }, function (type) {
                ext.initExtension(_self);
                return pgEmbeddedDebugNav;
            });

            dock.register(name, "dbgEmbeddedVariable", {
                menu: "Debugger/Variables",
                primary: {
                    backgroundImage: ide.staticPrefix + "/ext/main/style/images/debugicons.png",
                    defaultState: { x: -8, y: -174 },
                    activeState: { x: -8, y: -174 }
                }
            }, function (type) {
                ext.initExtension(_self);

                return dbgEmbeddedVariable;
            });

        },

        init: function (amlNode) {
            var _self = this;

            /* Event Listener for added/activated/deactivated Breakpoints (also updates on file save !!!) */
            mdlDbgBreakpoints.addEventListener("update", function (e) {

                customBreakpoints = new Array();
                /* Get the breakpoints */
                var breakpoints = _self.getBreakPoints();

                /* loop through breakpoints to get the filename and line number of the bp */
                for (var i = 0; i < breakpoints.length; i++) {
                    var bppathtemp = breakpoints[i].path.replace("/workspace/", "");
                    var bppath = bppathtemp.substring(0, bppathtemp.indexOf('/src/')) + "/";
                    if (bppath == require("ext/embedded_developer/embedded_developer").getDebugPath() && breakpoints[i].enabled == true) {
                        var breakpointproperty = new Object();
                        breakpointproperty.filename = breakpoints[i].path.replace(/^.*\/(?=[^\/]*$)/, "");
                        breakpointproperty.line = breakpoints[i].line;
                        customBreakpoints.push(breakpointproperty);
                    }
                }
                /* Send the updated breakpoints to our server plugin */
                var data = {
                    command: "firmware",
                    "operation": "updateBreakpoints",
                    "breakpoints": customBreakpoints,
                    requireshandling: true
                };
                ide.send(data);
            });

            /* Register Event listener to restore debug marker when switching
             * tabs during debugging */
            ide.addEventListener("init.ext/editors/editors", function (e) {

                ide.addEventListener("tab.afterswitch", function (e) {
                    /* Retrieve the path to the current open/displayed file */
                    var page = tabEditors.getPage();
                    var pathTemp;
                    if (page && page.$model && page.$doc.getNode().getAttribute("ignore") !== "1") {
                        var prefixRegex = new RegExp("^" + ide.davPrefix);
                        pathTemp = "/workspace" + page.$model.data.getAttribute("path").replace(prefixRegex, "");
                    }
                    /* If the current open file is equal to the currently debugged file
                     * restore the debug marker */
                    if (pathTemp == path) {

                        /* Remove debug marker */
                        var amlEditor = editors.currentEditor && editors.currentEditor.amlEditor;
                        var session = amlEditor && amlEditor.$editor.session;
                        if (!session)
                            return;
                        session.$stackMarker && _self.removeDebugMarker(session, "stack");
                        session.$stepMarker && _self.removeDebugMarker(session, "step");
                        setTimeout(function () {
                            /* Jump to file at specified line. We have to do this twice as
                             * cloud9 ignores the show command when file is already open and
                             * the cursor on the right position. Due to a bug the cursor is internally at
                             * the right position but not correctly displayed at the right position */
                            sources.show({
                                path: path,
                                row: row + 1,
                                column: 0
                            });
                            sources.show({
                                path: path,
                                row: row,
                                column: 0
                            });
                            setTimeout(function () {
                                /* Update debug marker */
                                _self.updateDebugMarker(path, row, 0);
                            }, 100);
                        }, 100);
                    }
                });
            });

            /* EventListener for socket messages */
            ide.addEventListener("socketMessage", function (e) {
                /* Gets the result about the debug variables from the last session*/
                if (e.message.type == "result" && e.message.subtype[0] == "loadVariables") {
                    /* Initialize model */
                    mdlEmbeddedDebug.load('<data>\
                </data>');
                    var debugVars = e.message.subtype[1];
                    /* Loop through received variables */
                    for (var i = 0; i < debugVars.length; i++) {
                        if (debugVars[i] != "") mdlEmbeddedDebug.appendXml('<embeddedvars name="' + debugVars[i] + '" value="unknown"></embeddedvars>');

                    }
                }

                /* Receives error if something went wrong when adding the variables from the list*/
                if (e.message.type == "result" && e.message.subtype == "writeFileError") {
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#ff0000'>" + apf.escapeXML("Failure writing debug variables!") + "</div>");
                }

                /* Returns a message when GDB is running */
                if (e.message.type == "result" && e.message.subtype == "gdb-ready") {
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#00ff00'>" + apf.escapeXML("Debugger is ready!") + "</div>");

                }
                /* Returns a message when GDB is not running */
                if (e.message.type == "result" && e.message.subtype == "gdb-not-running") {
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#ff0000'>" + apf.escapeXML("Debugger is not running!") + "<br />" + apf.escapeXML("Run C-Developer/Embedded Developer ==> Debug.") + "</div>");
                    _self.manageDebugcontrols(true, true, true, true, true);
                }

                /* Returns a message when the GDB exits */
                if (e.message.type == "result" && e.message.subtype == "gdb-exited") {
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#ff0000'>" + apf.escapeXML("Debugger exited!") + "</div>");
                    _self.manageDebugcontrols(true, true, true, true, true);
                    _self.embedded_stop(false);
                }

                /* Firmware flashing successful */
                if (e.message.type == "result" && e.message.subtype == "firmware-flashing-success") _self.embedded_stop(false);

                /* Gets the result about the next line when stepping through the code */
                if (e.message.type == "result" && e.message.subtype[0] == "atFileLine") {
                    /* Set visibility of debug controls */
                    _self.manageDebugcontrols(true, false, true, true, true);
                    /* Get the file and line */
                    var atFileLine = e.message.subtype[1].toString().trim();
                    /* Get the current debug directory to identify the right file */
                    atFileLine = require("ext/embedded_developer/embedded_developer").getDebugPath() + atFileLine;

                    path = "/workspace/" + atFileLine.substring(0, atFileLine.indexOf(":"));
                    row = parseInt(atFileLine.substring(atFileLine.indexOf(":") + 1)) - 1;

                    /* Remove debug marker */
                    var amlEditor = editors.currentEditor && editors.currentEditor.amlEditor;
                    var session = amlEditor && amlEditor.$editor.session;
                    if (!session)
                        return;
                    session.$stackMarker && _self.removeDebugMarker(session, "stack");
                    session.$stepMarker && _self.removeDebugMarker(session, "step");

                    setTimeout(function () {
                        /* Jump to file at specified line */
                        sources.show({
                            path: path,
                            row: row,
                            column: 0
                        });
                        setTimeout(function () {
                            /* Update debug marker */
                            _self.updateDebugMarker(path, row, 0);
                        }, 100);
                    }, 100);
                }
                /* Receives error if something went wrong when adding the variables from the list */
                if (e.message.type == "result" && e.message.subtype == "finish-not-meaningful") {
                    /* Set visibility of debug controls */
                    _self.manageDebugcontrols(true, false, true, true, true);
                    c9console.log("<div class='item console_log' style='font-weight:bold;color:#ff0000'>" + apf.escapeXML("Step \"finish\" not meaningful in the outermost frame.") + "</div>");
                }
                /* Gets a message of the value of a certain variable */
                if (e.message.type == "result" && e.message.subtype[0] == "variableValue") {
                    var variable = e.message.subtype[1].toString().trim();

                    /* Replace possible < and > signs, e.g., when using optimized compiler options */
                    variable = variable.replace(/[\<\>]/g, "");

                    /* Get the name */
                    var variablename = variable.substring(0, variable.indexOf("=") - 1);
                    /* Get the value and replace every "" with '', because it's not conform with xml */
                    var variablevalue = variable.substring(variable.indexOf("=") + 2);
                    variablevalue = variablevalue.replace(/"/g, '\'');

                    /* Get xml representation of the debug variables */
                    var xml = mdlEmbeddedDebug.getXml();
                    var varsxml = xml.getElementsByTagName("embeddedvars");
                    /* Initialize model */
                    mdlEmbeddedDebug.load('<data>\
                </data>');
                    /* Loop through the xml entries and append the edited values to it (Refreshed whole xml entries) */
                    for (var i = 0; i < varsxml.length; i++) {
                        if (varsxml[i].getAttribute("name") == variablename) varsxml[i].setAttribute("value", variablevalue);
                        mdlEmbeddedDebug.appendXml('<embeddedvars name="' + varsxml[i].getAttribute("name") + '" value="' + varsxml[i].getAttribute("value") + '"></embeddedvars>');
                    }

                }
            });
        },
        /* Gets all the settled breakpoints (+1 because the IDE counts from line 0 internally) */
        getBreakPoints: function (argument) {
            return mdlDbgBreakpoints.queryNodes("breakpoint").map(function (bp) {
                return {
                    path: bp.getAttribute("path") || "",
                    line: parseInt(bp.getAttribute("line"), 10) + 1,
                    column: parseInt(bp.getAttribute("column"), 10) || 0,
                    enabled: bp.getAttribute("enabled") == "true",
                    condition: bp.getAttribute("condition") || "",
                    ignoreCount: bp.getAttribute("ignoreCount") || 0
                };
            });
        },
        /* Manages the visibility of the debug navigation controls */
        manageDebugcontrols: function (resume, suspend, stepover, stepinto, stepout) {
            if (resume == false) btnEmbeddedResume.disable();
            else btnEmbeddedResume.enable();
            if (suspend == false) btnEmbeddedSuspend.disable();
            else btnEmbeddedSuspend.enable();
            if (stepover == false) btnEmbeddedStepOver.disable();
            else btnEmbeddedStepOver.enable();
            if (stepinto == false) btnEmbeddedStepInto.disable();
            else btnEmbeddedStepInto.enable();
            if (stepout == false) btnEmbeddedStepOut.disable();
            else btnEmbeddedStepOut.enable();
        },

        activate: function () {
            ext.initExtension(this);
            this.nodes.each(function (item) {
                if (item.show)
                    item.show();
            });
        },

        deactivate: function () {
            this.nodes.each(function (item) {
                if (item.hide)
                    item.hide();
            });
        },

        enable: function () {
            if (!this.disabled) return;

            this.nodesAll.each(function (item) {
                item.setProperty("disabled", item.$lastDisabled !== undefined ? item.$lastDisabled : true);
                delete item.$lastDisabled;
            });
            this.disabled = false;
        },

        disable: function () {
            if (this.disabled) return;

            /* stop debugging */
            /*  require('ext/runpanel/runpanel').stop(); */
            this.deactivate();

            /* loop from each item of the plugin and disable it */
            this.nodesAll.each(function (item) {
                if (!item.$lastDisabled)
                    item.$lastDisabled = item.disabled;
                item.disable();
            });

            this.disabled = true;
        },

        destroy: function () {
            commands.removeCommandsByName(
                ["embeddedresume", "embeddedstepinto", "embeddedstepover", "embeddedstepout"]);

            this.nodes.each(function (item) {
                dock.unregisterPage(item);
            });

            tabEmbeddedDebug.destroy(true, true);
            this.$layoutItem.destroy(true, true);

            this.$destroy();
        },

        /* Adds a marker to the editor at the line the debugger is halted */
        addDebugMarker: function (session, type, row) {
            var marker = session.addMarker(new Range(row, 0, row + 1, 0), "ace_" + type, "line", true);
            session.addGutterDecoration(row, type);
            session["$" + type + "Marker"] = { lineMarker: marker, row: row };
        },

        /* Removes the marker from the editor */
        removeDebugMarker: function (session, type) {

            var markerName = "$" + type + "Marker";
            session.removeMarker(session[markerName].lineMarker);
            session.removeGutterDecoration(session[markerName].row, type);
            session[markerName] = null;
        },

        /* Updates the position of the debug marker */
        updateDebugMarker: function (path, row, column) {
            var amlEditor = editors.currentEditor && editors.currentEditor.amlEditor;
            var session = amlEditor && amlEditor.$editor.session;
            if (!session || !path || !row)
                return;

            session.$stackMarker && this.removeDebugMarker(session, "stack");
            session.$stepMarker && this.removeDebugMarker(session, "step");

            var editorPath = amlEditor.xmlRoot.getAttribute("path");

            this.addDebugMarker(session, "step", row);
        },

        /* Resumes the HW */
        embedded_resume: function (stepaction, stepcount, callback) {
            var data;
            /* Step into */
            if (stepaction == "in") {
                data = {
                    command: "firmware",
                    "operation": "stepinto",
                    requireshandling: true
                };
                ide.send(data);
                this.manageDebugcontrols(false, true, false, false, false);
            }
            /* Step over*/
            else if (stepaction == "next") {
                data = {
                    command: "firmware",
                    "operation": "stepover",
                    requireshandling: true
                };
                ide.send(data);
                this.manageDebugcontrols(false, true, false, false, false);
            }
            /* Step out */
            else if (stepaction == "out") {
                data = {
                    command: "firmware",
                    "operation": "stepout",
                    requireshandling: true
                };
                ide.send(data);
                this.manageDebugcontrols(false, true, false, false, false);
            }
            /* Continue */
            else {
                data = {
                    command: "firmware",
                    "operation": "continue",
                    requireshandling: true
                };
                ide.send(data);
                this.manageDebugcontrols(false, true, false, false, false);
            }
        },
        /* Suspends the HW */
        embedded_suspend: function () {
            var data = {
                command: "firmware",
                "operation": "suspend",
                requireshandling: true
            };
            ide.send(data);
            this.manageDebugcontrols(true, false, true, true, true);
        },

        /* Stops the HW */
        embedded_stop: function (fromUi) {
            var data = {
                command: "firmware",
                "operation": "stop",
                requireshandling: true
            };
            if (fromUi == true) {
                data = {
                    command: "firmware",
                    "operation": "stop",
                    "fromui": fromUi,
                    requireshandling: true
                };
            }
            ide.send(data);
            data = {
                command: "firmware",
                "operation": "kill",
                requireshandling: true
            };
            ide.send(data);
            this.manageDebugcontrols(true, true, true, true, true);
            require("ext/embedded_developer/embedded_developer").setDebuggerStopped();

            /* Remove debug marker */
            var amlEditor = editors.currentEditor && editors.currentEditor.amlEditor;
            var session = amlEditor && amlEditor.$editor.session;
            if (!session)
                return;
            session.$stackMarker && this.removeDebugMarker(session, "stack");
            session.$stepMarker && this.removeDebugMarker(session, "step");

            path = null;
        },
        /* Adds variables to the debug interface */
        addEmbeddedDebugVariable: function () {

            var xml = mdlEmbeddedDebug.getXml();
            var vars = xml.getElementsByTagName("embeddedvars");
            /* Flag when an entry matches */
            var matching = false;
            for (var i = 0; i < vars.length; i++) {
                /* Check for duplicate entries. */
                if (vars[i].getAttribute("name") == tbAddDebugVariables.value.trim()) matching = true;
            }
            /* If there was no match, send the new variable to the server and append it to the current datagrid model */
            if (tbAddDebugVariables.value.trim() != "" && matching == false) {
                var data = {
                    command: "firmware",
                    "operation": "addDebugVariable",
                    "variablename": tbAddDebugVariables.value.trim(),
                    requireshandling: true
                };
                ide.send(data);
                /* Append the variable to the model */
                mdlEmbeddedDebug.appendXml('<embeddedvars name="' + tbAddDebugVariables.value.trim() + '" value="unknown"></embeddedvars>');
                data = {
                    command: "firmware",
                    "operation": "saveDebugVariables",
                    "debugVariableToSave": tbAddDebugVariables.value.trim(),
                    requireshandling: true
                };
                ide.send(data);
            }
        },
        /* Removes a variable from the view and the session file to not show anymore */
        removeEmbeddedDebugVariable: function () {
            mdlEmbeddedDebug.removeXml(dgEmbeddedVars.getSelection()[0]);
            var data = {
                command: "firmware",
                "operation": "removeDebugVariables",
                "debugVariableToDelete": dgEmbeddedVars.getSelection()[0].getAttribute("name"),
                requireshandling: true
            };
            ide.send(data);
        },
        /* Removes all variables from the view */
        removeEmbeddedDebugVariablesFromView: function () {
            if(this.dgEmbeddedVars != undefined)this.dgEmbeddedVars.clear();
        }

    });

});

