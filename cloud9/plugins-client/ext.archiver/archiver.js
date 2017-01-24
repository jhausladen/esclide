/**
 * Archiver Plugin for Cloud9 IDE
 * 
 * Is used to extract archives (tar.gz/tgz,7z and zip). 
 * Intended to be used for importing projects to Cloud9.
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
    var markup = require("text!ext/archiver/archiver.xml");

    var archive = false;

    /* Begin declaring module */
    module.exports = ext.register("ext/archiver/archiver", {
        name: "Archiver",
        dev: "SAT",
        alone: true,
        deps: [],
        type: ext.GENERAL,
        markup: markup,

        nodes: [],

        /* Init function (required) */
        init: function () {
            var _self = this;
            this.winArchiver = winArchiver;
            this.errormsgarchiver = errormsgarchiver;

            /* Bugfix: mnuCtxTree only exists if file explorer is initiated */
            var currentpanel = require("ext/panels/panels").currentPanel;
            var lastpanel = require("ext/panels/panels").lastPanel
            if (currentpanel == null || currentpanel.path != "ext/tree/tree") require("ext/tree/tree").show();

            /* EventListener for IDE messages */
            ide.addEventListener("socketMessage", function (e) {
                /* Checks for the end of the archiving process */
                if (e.message.type == "npm-module-exit" && archive == true) {
                    /* Update tree */
                    require("ext/tree/tree").refresh();
                    archive = false;
                }
            });

            /* Add event Listener for the context menu */
            mnuCtxTree.addEventListener("afterrender", function () {
                _self.nodes.push(
                    mnuCtxTree.insertBefore(new apf.item({
                        id: "mnuCtxTreeExtract",
                        match: "[file]",
                        visible: "{trFiles.selected.getAttribute('type')=='file'}",
                        caption: "Extract",
                        onclick: function () {
                            ext.initExtension(_self);
                            /* Get the path of the selected archive file */
                            var archivePath = trFiles.selected.getAttribute("path");

                            archivePath = archivePath.replace("/workspace/", "");

                            /* Set archive flag */
                            archive = true;

                            /* Replaces everything from the beginning to the last "/" */
                            archiveName = archivePath.replace(/^.*\/(?=[^\/]*$)/, '');

                            /* Replaces the "." and the following characters 
                             * Check the file suffixes for supported archive types 
                             * Extract the archive */
                            var suffix = archivePath.match(/\..*/, '');
                            var workdir = archivePath.match(/^.*\/(?=[^\/]*$)/);
                            if (workdir == null) workdir = ".";
                            if (suffix != null && suffix.toString().indexOf(".zip") > -1) c9console.evalInputCommand("sh -c 'cd " + ide.workspaceDir + "/" + workdir + " && unzip \"" + archiveName + "\"'");
                            else if (suffix != null && (suffix.toString().indexOf(".tar.gz") > -1 || suffix.toString().indexOf(".tgz") > -1)) c9console.evalInputCommand("sh -c 'cd " + ide.workspaceDir + "/" + workdir + " && tar -xzf \"" + archiveName + "\"'");
                            else if (suffix != null && suffix.toString().indexOf(".7z") > -1) c9console.evalInputCommand("sh -c 'cd " + ide.workspaceDir + "/" + workdir + " && 7z e \"" + archiveName + "\"'");
                            else {
                                _self.errormsgarchiver.setValue("The target archive type is not supported!<br> Please use one of the following archive types \".zip, .tar.gz/tgz, .7z\".");
                                _self.winArchiver.setTitle("Error: Archive type is not supported!");
                                _self.winArchiver.show();
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
        /* Required: Used when disabled in the extension manager */
        destroy: function () {
            this.nodes.each(function (item) {
                item.destroy(true, true);
            });
            this.nodes = [];
        },

        /* Function that simply closes the window */
        closeArchiverWindow: function () {
            this.winArchiver.hide();
        },

    });

});
