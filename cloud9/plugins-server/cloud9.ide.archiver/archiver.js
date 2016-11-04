/**
 * Archiver plugin for the Cloud9 IDE to create tar.gz archives
 *
 * @author Jürgen Hausladen
 * @copyright 2016, SAT, FH Technikum Wien
 * @license AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

"use strict";

var Plugin = require("../cloud9.core/plugin");
var util = require("util");
var fs = require("fs");

/* Extension name */
var name = "archiver";
var workspacepath;
var _self;

/* Get the time and date for log outputs */
function getDateTime() {

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
}

/* Initialization stuff */
module.exports = function setup(options, imports, register) {
    imports.ide.register(name, ArchiverPlugin, register);
};

var ArchiverPlugin = function (ide) {
    this.ide = ide;
    this.hooks = ["command"];
    this.name = "archiver";
    workspacepath = ide.workspaceDir;

};

util.inherits(ArchiverPlugin, Plugin);

/* This parts holds the main function */
(function () {

    /**
    * Entry point for hooked command from the Plugin arch.
    * Determines if the primary command is "firmware" and then
    * handles the subcommand. Assumes the user is passing a
    * debug argument in @message to perform a flash/debug operation
    *
    * @param {object} user
    * @param {object} message User's message to the plugin
    * @param {object} client Client connection to the server
    * @return {boolean} False if message.command != "firmware" so the Plugin
    *      architecture knows to keep asking other plugins if they handle
    *      message.command
    */
    this.command = function (user, message, clientConnection) {
        if (message.command != "archive") {

            return false;
        }

        _self = this;


        var path = null;
        var type = null

        /* Get the path and archive type */
        if (message.path != null && message.archivetype != null) {
            path = message.path.toString().trim();
            type = message.archivetype.toString().trim();
            /* Check if the root folder is selected as we cannot create an archive
             * in the folder that is to be archived*/
            if (path != "/workspace") spawnArchiver(path, type);
            else return true;
        }


        /* Create child process with GDB */
        function spawnArchiver(pathtofolder, archivetype) {

            var spawn, archiver;

            /* Get the path to the main workspace folder */
            var pathtoworkspace = workspacepath + "/"; //+"/bin/" for standard C, remove "/"
            /* Remove the "/workspace/" synonym */
            var folder = pathtofolder.replace("/workspace/", "");
            /* Construct the full path */
            var fullPath = pathtoworkspace + folder;

            //var foldername = folder.replace(/^.*\/(?=[^\/]*$)/, '');
            /* Check if the path is actually a folder or a file */
            if (fs.lstatSync(fullPath).isDirectory()) {
                spawn = require('child_process').spawn,
                    archiver = spawn('tar', ['-czf', fullPath + ".tar.gz", '-C', fullPath, '.']);
            }
            /* If the path was a file, create the appropriate paths */
            else {
                var lastSlashIndex = fullPath.lastIndexOf("/");
                var tmpPath = fullPath.substring(0, lastSlashIndex);
                var filename = fullPath.substring(lastSlashIndex + 1, fullPath.length)

                spawn = require('child_process').spawn,
                    archiver = spawn('tar', ['-czf', fullPath + ".tar.gz", '-C', tmpPath, filename]);
            }

            /* Output from the archiving process */
            archiver.stdout.on('data', function (data) {
                /* Split the incoming data for "\n" */
                var splitdata = (data.toString().trim()).split("\n");
            });

            /* On error */
            archiver.stderr.on('data', function (data) {
                console.log(getDateTime() + ': child process (Archiver) error code ' + data);
            });
            /* On close */
            archiver.on('close', function (code) {
                console.log(getDateTime() + ': child process (Archiver) exited with code ' + code);
                /* Send response back to client-side plug-in */
                var response = new Array();
                response[0] = "archivepath";
                if (code == 0) response[1] = pathtofolder + ".tar.gz";
                else response[1] = null;
                _self.sendResult(0, response);

            });
        }
        return true;
    };
}).call(ArchiverPlugin.prototype);