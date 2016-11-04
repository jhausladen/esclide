/**
 * Exporter Plugin for Cloud9 IDE
 * 
 * Is used to export single files and folders from Cloud9
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
    var markup = require("text!ext/exporter/exporter.xml");

    var httpPort = 3000;

    /* Begin declaring module */
    module.exports = ext.register("ext/exporter/exporter", {
        name: "Exporter",
        dev: "SAT",
        alone: true,
        deps: [],
        type: ext.GENERAL,
        markup: markup,

        nodes: [],

        /* Init function (required) */
        init: function () {
            var _self = this;
            this.winExporter = winExporter;
            this.errormsgexporter = errormsgexporter;

            /* Bugfix: mnuCtxTree only exists if file explorer is initiated */
            var currentpanel = require("ext/panels/panels").currentPanel;
            var lastpanel = require("ext/panels/panels").lastPanel
            if (currentpanel == null || currentpanel.path != "ext/tree/tree") require("ext/tree/tree").show();

            /* EventListener for IDE messages */
            ide.addEventListener("socketMessage", function (e) {

                /* Gets the result about the HTTP download Port */
                if (e.message.type == "result" && e.message.subtype[0] == "httpportconf") {
                    httpPort = e.message.subtype[1];
                }

                /* Checks when the archiving process has finished */
                if (e.message.type == "result" && e.message.subtype[0] == "archivepath") {
                    if (e.message.subtype[1] == null) {
                        _self.errormsgexporter.setValue("The archive could not be created!<br> Please try again later.");
                        _self.winExporter.setTitle("Error: Archiving folder!");
                        _self.winExporter.show();
                    }

                    else {
                        /* Download file! */
                        var popUp = window.open("http://" + window.location.hostname + ":" + httpPort + "/export?" + e.message.subtype[1], '_blank');
                        window.setTimeout(function () {
                            popUp.close();
                        }, 1000);
                        /* Refresh file manager */
                        require("ext/tree/tree").refresh();
                    }
                }
            });

            mnuCtxTree.addEventListener("afterrender", function () {
                _self.nodes.push(
                    mnuCtxTree.insertBefore(new apf.item({
                        id: "mnuCtxTreeExport",
                        /* match : "[file,folder]", */
                        visible: true,
                        caption: "Export",
                        onclick: function () {
                            ext.initExtension(_self);
                            /* Get the archive path */
                            var archivePath = trFiles.selected.getAttribute("path");

                            /* Replaces the "." and the following characters 
                             * Gets the suffix to check for file/folder */
                            var suffix = archivePath.match(/\..*/, '')
                            if (suffix != null) {
                                /* Download file! */
                                var popUp = window.open("http://" + window.location.hostname + ":" + httpPort + "/export?" + archivePath, '_blank');
                                window.setTimeout(function () {
                                    popUp.close();
                                }, 1000);
                            }
                            else {
                                /* Send message to archive the folder */
                                data = {
                                    command: "archive",
                                    "archivetype": "tar.gz",
                                    "path": archivePath,
                                    requireshandling: true
                                };
                                ide.send(data);
                            }

                        }
                    }), itemCtxTreeNewFile),
                    mnuCtxTree.insertBefore(new apf.divider({
                        visible: "{mnuCtxTreeExtract.visible}"
                    }), itemCtxTreeNewFile)
                );
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
        /* Required: Used when diabled in the extension manager */
        destroy: function () {
            this.nodes.each(function (item) {
                item.destroy(true, true);
            });
            this.nodes = [];
        },

        /* Function that simply closes the hello world window */
        closeExporterWindow: function () {
            this.winExporter.hide();
        },

    });

});
