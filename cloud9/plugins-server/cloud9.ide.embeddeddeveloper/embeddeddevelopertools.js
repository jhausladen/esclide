/**
 * Embedded Developer Tools Server plugin for the Cloud9 IDE
 *
 * @author Jürgen Hausladen
 * @copyright 2016, SAT, FH Technikum Wien
 * @license AGPL <http://www.gnu.org/licenses/agpl.txt>
 */

"use strict";

var Plugin = require("../cloud9.core/plugin");
var util = require("util");
var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var mime = require('mime');
var net = require('net');

var workspacepath;
var TCP_HOST_LOCAL = "127.0.0.1";
var TCP_PORT = 4445;
var NOOB_CONF = 0;
var TCP_GDB_EMULATION_PORT = 5556;
var HTTP_SERVER_PORT = 3000;
var WEBSOCKET_SERVER_PORT = 8080;
var TCP_PORT_OOCD = 4444;
var TCP_PORT_GDB = 3333;
var gdbProcess, gdbProcessFlash;
var platform;
var binaryPath;

/* Keep track of the chat clients */
var clients = [];
var clientGDBtranssocket = [];
var clientGDBemusocket = [];
var debugGDB;
var _self;
var breakpoints = new Array();
var variables = new Array();
var cloudLocation = "/SAT/escloud/";
var exitDebugger;
var cmdLineStdCParams;
var amd64param;
var lockGDB = 0;
/* Reads the certificates for the https server */
/*var options = {
  key: fs.readFileSync('/home/juergen/Cloud9/certs/key.pem'),
  cert: fs.readFileSync('/home/juergen/Cloud9/certs/cert.pem')
};*/

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

/* Reads the debug port config for the connection between the target-side
 * and server */
if (process.env.CONTAINER == "docker") {
    try {
        TCP_PORT = fs.readFileSync("/cloud9/debugport.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}
else {
    try {
        TCP_PORT = fs.readFileSync(__dirname + "/../../../configs/debugport.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}

/* Reads the NOOB config */
if (process.env.CONTAINER == "docker") {
    try {
        NOOB_CONF = fs.readFileSync("/cloud9/noob.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}
else {
    try {
        NOOB_CONF = fs.readFileSync(__dirname + "/../../../configs/noob.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}

/* Reads the http port config for the connection between the target-side
 * and server */
if (process.env.CONTAINER == "docker") {
    try {
        HTTP_SERVER_PORT = fs.readFileSync("/cloud9/httpdownload.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}
else {
    try {
        HTTP_SERVER_PORT = fs.readFileSync(__dirname + "/../../../configs/httpdownload.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}
/* Reads the Websocket port config for the connection between the target-side
 * and browser */
if (process.env.CONTAINER == "docker") {
    try {
        WEBSOCKET_SERVER_PORT = fs.readFileSync("/cloud9/wsport.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}
else {
    try {
        WEBSOCKET_SERVER_PORT = fs.readFileSync(__dirname + "/../../../configs/wsport.conf", 'utf8');
    }
    catch (err) {
        console.log("ERROR(" + getDateTime() + "): " + err);
    }
}
/* Open the https server, for http (https==>http,rm options) client plugin https ==> http */
http.createServer(function (req, res) {

    /* If the URL includes the download string, look for the file and pipe it back */
    if (req.url.indexOf("/download?") > -1) {
        var binary = req.url.replace("/download?", '');

        /* Get the path to the main workspace folder */
        var pathtobinary = workspacepath + "/"; //+"/bin/" for standard C, remove "/"

        /* Set path to the bin file*/
        var file = pathtobinary + binary + "/bin/firmware.elf";

        var filename = path.basename(file);
        /* Get mimetype of file */
        var mimetype = mime.lookup(file);
        /* Set response headers */
        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', mimetype);
        /* Create filestream of file and pipe back to client */
        var filestream = fs.createReadStream(file);
        /* This will wait until we know the readable stream is actually valid before piping */
        filestream.on('open', function () {
            /* This just pipes the read stream to the response object (which goes to the client) */
            filestream.pipe(res);
        });
        /* This catches any errors that happen while creating the readable stream (usually invalid names) */
        filestream.on('error', function (err) {
            console.log(getDateTime() + ': Firmware download error: ' + err);
        });
    }
    /* If the URL includes the export string, look for the file and pipe it back */
    else if (req.url.indexOf("/export?") > -1) {
        var file = req.url.replace("/export?/workspace/", '');

        /* Get the path to the main workspace folder */
        var pathtoworkspace = workspacepath + "/"; //+"/bin/" for standard C, remove "/"

        /* Get the full path to the file */
        file = pathtoworkspace + file;

        var filename = path.basename(file);
        /* Get mimetype of file */
        var mimetype = mime.lookup(file);
        /* Set response headers */
        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', mimetype);
        /* Create filestream of file and pipe back to client */
        var filestream = fs.createReadStream(file);
        /* This will wait until we know the readable stream is actually valid before piping */
        filestream.on('open', function () {
            /* This just pipes the read stream to the response object (which goes to the client) */
            filestream.pipe(res);
        });
        /* This catches any errors that happen while creating the readable stream (usually invalid names) */
        filestream.on('error', function (err) {
            console.log(getDateTime() + ': File download error: ' + err);
        });
    }
    /* If there was a false request output an access denied message */
    else {
        console.log(getDateTime() + ': Access denied error (Download): ' + req.url);
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<b><big>HTTP Status 403 Forbidden - Access denied</big></b><br>You do not have permissions to access this page!');
    }
}).listen(HTTP_SERVER_PORT);


/* Start the GDB emulation TCP Server
 * This server is waiting for a connection of the GDB
 * Only local service, not meant to be connected from outside */
var gdbserver;
function createGDBServer() {

    gdbserver = net.createServer(function (socket) {

        /* Identify this client */
        socket.name = socket.remoteAddress + ":" + socket.remotePort

        /* Put this new client in the list */
        clientGDBemusocket.push(socket);

        /* Handle incoming messages from clients. */
        socket.on('data', function (data) {

            if (clientGDBtranssocket[0] != undefined) clientGDBtranssocket[0].write(data);

        });
        /* Handle socket ERRORs. */
        socket.on('error', function (e) {
            console.log(getDateTime() + ": ERR(GDBServer):" + e.code);
        });

        /* Remove the client from the list when it leaves */
        socket.on('end', function () {
            clientGDBemusocket.splice(clientGDBemusocket.indexOf(socket), 1);
            //broadcast("5556"+socket.name + " left the chat.\n");
            console.log(getDateTime() + ": (GDB Server): GDB left the Chat");
        });



    });
    gdbserver.maxConnections = 1;
    gdbserver.listen(TCP_GDB_EMULATION_PORT, TCP_HOST_LOCAL);

}
/* Close all active client connections to end the GDB emulation TCP server */
function closeGDBServer() {

    /* destroy all client sockets (this will emit the 'close' event above) */
    for (var i in clientGDBemusocket) {
        clientGDBemusocket[i].destroy();
    }
    clientGDBemusocket = [];
    gdbserver.close(function () {
        console.log('GDBServer closed.');
    });
}

/* Start the GDB emulation TCP Server */
createGDBServer();

/* Start the Client/Server TCP Server
 * This server communicates with the client and forwards
 * all GDB traffic in both directions*/
var gdbTransserver;
function createTransmissionServer() {

    gdbTransserver = net.createServer(function (socket) {

        /* Identify this client */
        socket.name = socket.remoteAddress + ":" + socket.remotePort

        /* Put this new client in the list */
        clientGDBtranssocket.push(socket);

        /* Handle incoming messages from clients. */
        socket.on('data', function (data) {
            //console.log(clientGDBemusocket[0]+"Pipe to GDB: "+data+"\n");
            //console.log("Data on GDB Server In: "+data.toString());
            if (clientGDBemusocket[0] != undefined) clientGDBemusocket[0].write(data);
        });

        /* Handle socket ERRORs. */
        socket.on('error', function (e) {
            console.log(getDateTime() + ": ERR(RedirectionServer):" + e.code);
        });

        /* Remove the client from the list when it leaves */
        socket.on('end', function () {
            clientGDBtranssocket.splice(clientGDBtranssocket.indexOf(socket), 1);
            //broadcast("5556"+socket.name + " left the chat.\n");
            console.log(getDateTime() + ": (Trans server): DBG-Control service left the Chat");
        });
    });
    gdbTransserver.maxConnections = 1;
    gdbTransserver.listen(TCP_PORT);
}
/* Close all active sockets to end the Client/Server TCP server*/
function closeTransmissionServer() {

    /* destroy all clients (this will emit the 'close' event above) */
    for (var i in clientGDBtranssocket) {
        clientGDBtranssocket[i].destroy();
    }
    clientGDBtranssocket = [];
    gdbTransserver.close(function () {
        console.log('RedirectionServer closed.');
    });
}

/* Start the Client/Server TCP server */
createTransmissionServer();

/* Extension name */
var name = "embeddeddevelopertools";
/* Initialization stuff */
module.exports = function setup(options, imports, register) {
    imports.ide.register(name, EmbeddedDeveloperToolsPlugin, register);
};

var EmbeddedDeveloperToolsPlugin = function (ide) {
    this.ide = ide;
    this.hooks = ["command"];
    this.name = "embeddeddevelopertools";
    workspacepath = ide.workspaceDir;

};

util.inherits(EmbeddedDeveloperToolsPlugin, Plugin);

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
        if (message.command != "firmware") {

            return false;
        }

        _self = this;

        /* Get the path to the "bin" folder */
        if (message.path != null) binaryPath = workspacepath + "/" + message.path;

        /* Log date and time the user connects/disconnects */
        if (message.logging != null) console.log(getDateTime() + ": " + message.logging);

        /* Get the cmdline parameters for C-Programs */
        if (message.cmdparam != null) cmdLineStdCParams = message.cmdparam;

        /* Restart Client->Server TCP server */
        if (message.restartredirectionserver == true) {

            closeTransmissionServer();
            createTransmissionServer();

            /*closeGDBServer();
            createGDBServer();*/
        }

        /* Get the port number for the GDB service */
        if (message.publicdebugport == true) {
            var debugportconf = new Array();
            debugportconf[0] = "debugportconf";
            debugportconf[1] = TCP_PORT;
            _self.sendResult(0, debugportconf);
        }

        /* Get the NOOB conf */
        if (message.noobconf == true) {
            var noobconf = new Array();
            noobconf[0] = "noobconf";
            noobconf[1] = NOOB_CONF;
            _self.sendResult(0, noobconf);
        }

        /* Get the port number for the HTTP service */
        if (message.publichttpport == true) {
            var httpportconf = new Array();
            httpportconf[0] = "httpportconf";
            httpportconf[1] = HTTP_SERVER_PORT;
            _self.sendResult(0, httpportconf);
        }
        /* Get the port number for the Websocket service */
        if (message.publicwsport == true) {
            var wsportconf = new Array();
            wsportconf[0] = "wsportconf";
            wsportconf[1] = WEBSOCKET_SERVER_PORT;
            _self.sendResult(0, wsportconf);
        }

        /* Get the platform when the user wants to flash or debug hardware */
        if (message.platform != null) platform = message.platform.toString().trim();

        switch (message.platform) {
            case "TM4C1294XL":

                if (message.operation == "flash") {
                    /* Check if the client side software is already connected and GDB not running*/
                    if (clientGDBtranssocket[0] != undefined && platform != undefined && clientGDBemusocket[0] == undefined && lockGDB == 0) {
                        lockGDB = 1;
                        /* Create a separate GDB Process */
                        spawnDebugGDB(binaryPath, message.operation, function (gdbobject) {
                            gdbProcess = gdbobject;
                            _self.sendResult(0, "gdb-ready");
                        });
                    }
                    else console.log(getDateTime() + ": Could not flash TM4C1294XL: " + clientGDBtranssocket[0] + platform + clientGDBemusocket[0] + "\n");

                }
                if (message.operation == "debug") {
                    /* Check if the client side software is already connected and GDB not running*/
                    if (clientGDBtranssocket[0] != undefined && platform != undefined && clientGDBemusocket[0] == undefined && lockGDB == 0) {
                        lockGDB = 1;
                        /* Create a separate GDB Process */
                        spawnDebugGDB(binaryPath, message.operation, function (gdbobject) {
                            gdbProcess = gdbobject;
                            _self.sendResult(0, "gdb-ready");
                        });
                    }
                    else console.log(getDateTime() + ": Could not debug TM4C1294XL: " + clientGDBtranssocket[0] + platform + clientGDBemusocket[0] + "\n");
                }
                break;

            case "XMC4500":

                if (message.operation == "flash") {
                    /* Check if the client side software is already connected and GDB not running */
                    if (clientGDBtranssocket[0] != undefined && platform != undefined && clientGDBemusocket[0] == undefined && lockGDB == 0) {
                        lockGDB = 1;
                        /* Create a separate GDB Process */
                        spawnDebugGDB(binaryPath, message.operation, function (gdbobject) {
                            gdbProcess = gdbobject;
                            _self.sendResult(0, "gdb-ready");
                        });
                    }
                    else console.log(getDateTime() + ": Could not flash XMC4500: " + clientGDBtranssocket[0] + platform + clientGDBemusocket[0] + "\n");
                }
                if (message.operation == "debug") {
                    /* Check if the client side software is already connected and GDB not running */
                    if (clientGDBtranssocket[0] != undefined && platform != undefined && clientGDBemusocket[0] == undefined && lockGDB == 0) {
                        lockGDB = 1;
                        /* Create a separate GDB Process */
                        spawnDebugGDB(binaryPath, message.operation, function (gdbobject) {
                            gdbProcess = gdbobject;
                            _self.sendResult(0, "gdb-ready");
                        });
                    }
                    else console.log(getDateTime() + ": Could not debug XMC4500: " + clientGDBtranssocket[0] + platform + clientGDBemusocket[0] + "\n");
                }
                break;
            case "AMD64":

                if (message.operation == "debugstdc") {
                    /* Check if the client side software is already connected and GDB not running */
                    if (platform != undefined && lockGDB == 0) {
                        lockGDB = 1;
                        /* Create a separate GDB Process */
                        spawnDebugGDB(binaryPath, message.operation, function (gdbobject) {
                            gdbProcess = gdbobject;
                            _self.sendResult(0, "gdb-ready");
                        });
                    }
                    else console.log(getDateTime() + ": Could not debug AMD64: " + clientGDBtranssocket[0] + platform + clientGDBemusocket[0] + "\n");
                }
                break;
            case undefined:
                console.log(getDateTime() + ": INFO: Control message received! " + message.operation);
                break;
            default:
                console.log(getDateTime() + ": ERROR: Unknown development platform " + message.platform);

        }


        /* If the user wants to debug the HW */
        if (message.operation == "debug") {
            breakpoints = message.breakpoints;
            variables = message.variables;
        }
        /* Debug continue */
        if (message.operation == "continue") {
            if (gdbProcess == null) _self.sendResult(0, "gdb-not-running");
            if (gdbProcess != null) gdbProcess.stdin.write("continue\n");
        }
        /* Debug step into */
        if (message.operation == "stepinto") {
            if (gdbProcess == null) _self.sendResult(0, "gdb-not-running");
            if (gdbProcess != null) gdbProcess.stdin.write("step\n");
        }
        /* Debug step over */
        if (message.operation == "stepover") {
            if (gdbProcess == null) _self.sendResult(0, "gdb-not-running");
            if (gdbProcess != null) gdbProcess.stdin.write("next\n");
        }
        /* Debug step out */
        if (message.operation == "stepout") {
            if (gdbProcess == null) _self.sendResult(0, "gdb-not-running");
            if (gdbProcess != null) gdbProcess.stdin.write("finish\n");
        }
        /* Debug suspend */
        if (message.operation == "suspend") {
            if (gdbProcess == null) _self.sendResult(0, "gdb-not-running");
            if (gdbProcess != null) gdbProcess.kill("SIGINT");
        }
        /* Debug stop */
        if (message.operation == "stop") {
            if (gdbProcess == null) _self.sendResult(0, "gdb-not-running");
            if (gdbProcess != null) {
                gdbProcess.stdin.write("monitor reset\n");

                exitDebugger = true;
                /* Halt target */
                gdbProcess.kill("SIGINT");
                gdbProcess.stdin.write("quit\n");
                gdbProcess.stdin.write("quit\n");
            }
        }

        /* Kill all running C-programs */
        if (message.operation == "kill") {
            console.log(workspacepath);
            var cmd;
            var spawn = require('child_process').spawn,
                cmd = spawn('pkill', ['-f', '-u', workspacepath.replace("/", ""), 'a.out']);
        }

        /* Debug add watch variables */
        if (message.operation == "addDebugVariable") {
            if (gdbProcess != null) gdbProcess.stdin.write("display " + message.variablename + "\n");
        }
        /* Update debug bvreakpoints */
        if (message.operation == "updateBreakpoints") {
            /* Delet all breakpoints */
            if (gdbProcess != null) gdbProcess.stdin.write("delete\n");
            /* Check available Breakpoints */
            for (var i = 0; i < message.breakpoints.length; i++) {

                /* Add Breakpoints */
                if (gdbProcess != null) gdbProcess.stdin.write("break " + message.breakpoints[i].filename + ":" + message.breakpoints[i].line + "\n");

            }

        }

        /* If the debug plugin wants to reload variables e.g. after refresing browser page */
        if (message.operation == "recoverDebugVariables") {

            /* Asynchronous file reading */
            var filePath;

            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            var data = fs.readFile(filePath, 'utf8', function (err, data) {
                if (err) {
                    console.log(getDateTime() + ": ERROR (read debugvars): " + err);
                }
                else {
                    if (isJson(data)) {
                        var configuration = JSON.parse(data)
                        if (configuration.debugvariables != undefined) {
                            /* Split data into parts and send it to the client */
                            var variables = new Array();
                            variables[0] = "loadVariables";
                            variables[1] = configuration.debugvariables.split(":");
                            _self.sendResult(0, variables);
                        }
                    }
                }
            });
        }
        /* Save current debug variables to a file */
        if (message.operation == "saveDebugVariables") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read debugvars): " + err);
            }
            var matching = false;
            /* If data is undefined e.g. file does not exist add new variable,
             * otherwise append it to the previous data or do nothing if already exists */
            if (data != undefined && isJson(data)) {
                var configuration = JSON.parse(data);
                if (configuration.debugvariables == undefined) configuration.debugvariables = '';
                var dataSplit = configuration.debugvariables.split(":");
                for (var i = 0; i < dataSplit.length; i++) {
                    if (dataSplit[i] == message.debugVariableToSave) matching = true;
                }
                if (!matching) configuration.debugvariables = configuration.debugvariables + message.debugVariableToSave + ":";
            } else if (!matching) {
                var configuration = { 'debugvariables': '' };
                configuration.debugvariables = message.debugVariableToSave + ":";
                var variables = new Array();
                variables[0] = "loadVariables";
                variables[1] = configuration.debugvariables.split(":");
                _self.sendResult(0, variables);
            }
            /* Synchronous file writing (Otherwise problems when adding variables when disconnected) */
            try {
                fs.writeFileSync(filePath, JSON.stringify(configuration));
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (write debugvars): " + err);
                _self.sendResult(0, "writeFileError");
            }

        }

        /* Remove certain variables from the file */
        if (message.operation == "removeDebugVariables") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read debugvars): " + err);
            }
            /* Replace variable and write new buffer to file */
            if (data != undefined && isJson(data)) {
                var configuration = JSON.parse(data);
                if (configuration.debugvariables == undefined) configuration.debugvariables = '';
                else configuration.debugvariables = configuration.debugvariables.replace(message.debugVariableToDelete + ":", "");

                /* Synchronous file writing */
                try {
                    fs.writeFileSync(filePath, JSON.stringify(configuration));
                }
                catch (err) {
                    console.log(getDateTime() + ": ERROR (write debugvars): " + err);
                    _self.sendResult(0, "writeFileError");
                }
            }

        }

        /* If the debug plugin wants to reload analysis functions */
        if (message.operation == "recoverAnalysisFunctions") {

            /* Asynchronous file reading */
            var filePath;

            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            var data = fs.readFile(filePath, 'utf8', function (err, data) {
                if (err) {
                    console.log(getDateTime() + ": ERROR (read debugvars): " + err);
                }
                else {
                    if (isJson(data)) {
                        var configuration = JSON.parse(data)
                        if (configuration.AnalysisFunctions != undefined) {
                            /* Split data into parts and send it to the client */
                            var variables = new Array();
                            variables[0] = "loadAnalysisFunctions";
                            variables[1] = configuration.AnalysisFunctions.split(":");
                            _self.sendResult(0, variables);
                        }
                    }
                }
            });

        }
        /* Save current analysis functions to a file */
        if (message.operation == "saveAnalysisFunction") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read debugvars): " + err);
            }
            var matching = false;
            /* If data is undefined e.g. file does not exist add new function,
             * otherwise append it to the previous data or do nothing if already exists */
            if (data != undefined && isJson(data)) {
                var configuration = JSON.parse(data);
                if (configuration.AnalysisFunctions == undefined) configuration.AnalysisFunctions = '';
                var dataSplit = configuration.AnalysisFunctions.split(":");
                for (var i = 0; i < dataSplit.length; i++) {
                    if (dataSplit[i] == message.analysisFunctionToSave) matching = true;
                }
                if (!matching) configuration.AnalysisFunctions = configuration.AnalysisFunctions + message.analysisFunctionToSave + ":";
            } else if (!matching) {
                var configuration = { 'AnalysisFunctions': '' };
                configuration.AnalysisFunctions = message.analysisFunctionToSave + ":";
                var functions = new Array();
                functions[0] = "loadAnalysisFunctions";
                functions[1] = configuration.AnalysisFunctions.split(":");
                _self.sendResult(0, functions);
            }
            /* Synchronous file writing (Otherwise problems when adding variables when disconnected) */
            try {
                fs.writeFileSync(filePath, JSON.stringify(configuration));
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (write debugvars): " + err);
                _self.sendResult(0, "writeFileError");
            }

        }

        /* Remove certain functions from the file */
        if (message.operation == "removeAnalysisFunction") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read debugvars): " + err);
            }
            /* Replace variable and write new buffer to file */
            if (data != undefined && isJson(data)) {
                var configuration = JSON.parse(data);
                if (configuration.AnalysisFunctions == undefined) configuration.AnalysisFunctions = '';
                else configuration.AnalysisFunctions = configuration.AnalysisFunctions.replace(message.analysisFunctionToDelete + ":", "");

                /* Synchronous file writing */
                try {
                    fs.writeFileSync(filePath, JSON.stringify(configuration));
                }
                catch (err) {
                    console.log(getDateTime() + ": ERROR (write debugvars): " + err);
                    _self.sendResult(0, "writeFileError");
                }
            }

        }

        /* Remove certain breakpoints from the file */
        if (message.operation == "removeBreakpoint") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read debugvars): " + err);
            }
            /* Replace variable and write new buffer to file */
            if (data != undefined && isJson(data)) {
                var configuration = JSON.parse(data);
                if (configuration.breakpoints == undefined) configuration.breakpoints = '';
                else configuration.breakpoints = configuration.breakpoints.replace(message.breakpointToDelete + ",", "");

                /* Synchronous file writing */
                try {
                    fs.writeFileSync(filePath, JSON.stringify(configuration));
                }
                catch (err) {
                    console.log(getDateTime() + ": ERROR (write debugvars): " + err);
                    _self.sendResult(0, "writeFileError");
                }
            }

        }
        /* Save current breakpoints to a file */
        if (message.operation == "saveBreakpoint") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read debugvars): " + err);
            }
            var matching = false;

            /* If data is undefined e.g. file does not exist add new variable,
             * otherwise append it to the previous data or do nothing if already exists */
            if (data != undefined && isJson(data)) {

                var configuration = JSON.parse(data);
                if (configuration.breakpoints == undefined) configuration.breakpoints = '';
                var dataSplit = configuration.breakpoints.split(",");
                for (var i = 0; i < dataSplit.length; i++) {
                    if (dataSplit[i] == message.breakpoint) matching = true;
                }
                if (!matching) configuration.breakpoints = configuration.breakpoints + message.breakpoint + ",";
            } else if (!matching) {

                var configuration = { 'breakpoints': '' };
                configuration.breakpoints = message.breakpoint + ",";
            }
            /* Synchronous file writing (Otherwise problems when adding variables when disconnected) */
            try {
                fs.writeFileSync(filePath, JSON.stringify(configuration));
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (write debugvars): " + err);
                _self.sendResult(0, "writeFileError");
            }

        }

        /* If the debug plugin wants to reload variables e.g. after refresing browser page */
        if (message.operation == "recoverBreakpoints") {

            /* Asynchronous file reading */
            var filePath;

            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            var data = fs.readFile(filePath, 'utf8', function (err, data) {
                if (err) {
                    console.log(getDateTime() + ": ERROR (read debugvars): " + err);
                }
                else {
                    if (isJson(data)) {
                        var configuration = JSON.parse(data)
                        if (configuration.breakpoints != undefined) {
                            /* Split data into parts and send it to the client */
                            var breakpoints = new Array();
                            breakpoints[0] = "loadBreakpoints";
                            breakpoints[1] = configuration.breakpoints;
                            _self.sendResult(0, breakpoints);
                        }
                    }
                }
            });
        }

        /* Scan for analysis script at "/usr/local/share/Otawa/scripts/" */
        if (message.operation == "scanForAnalysisScripts") {
            fs.readdir("/usr/local/share/Otawa/scripts/", function (err, files) {
                if (err) throw err;
                var osxfiles = new Array();
                for (var i in files) {
                    if (path.extname(files[i]) === ".osx") {
                        osxfiles.push(files[i]);
                    }
                }
                var availableScripts = new Array();
                availableScripts[0] = "availableScripts";
                availableScripts[1] = osxfiles;
                _self.sendResult(0, availableScripts);
            });
        }

        /* Save current IDE config such as the GDB server path to a file */
        if (message.operation == "saveConfigEntry" || message.operation == "debugconf") {
            var data;
            /* Synchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            try {
                data = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (read ideconfig): " + err);
            }
            var matching = false;
            var splitentry = new Array();
            var fullentry;
            if (message.operation == "saveConfigEntry") {
                splitentry = message.configEntry.split(":", 1);
                var indexOfSplitentry = message.configEntry.indexOf(":");
                var splitentryvalue = message.configEntry.substring(indexOfSplitentry + 1);
                splitentry.push(splitentryvalue);
                fullentry = message.configEntry;
            }
            if (message.operation == "debugconf") {
                splitentry[0] = "Target";
                splitentry[1] = message.platform;
                fullentry = splitentry[0] + ":" + splitentry[1]
            }

            /* If data is undefined e.g. file does not exist add new variable, 
             * otherwise append it to the previous data or do nothing if already exists */
            var configuration
            if (data != undefined) configuration = JSON.parse(data);
            else configuration = {};
            if (splitentry[0] == "Target") configuration.Target = splitentry[1];
            if (splitentry[0] == "TargetSideAddresses") configuration.TargetSideAddresses = splitentry[1];
            if (splitentry[0] == "ActiveTargetSideAddress") configuration.ActiveTargetSideAddress = splitentry[1];
            if (splitentry[0] == "JLink") configuration.JLink = splitentry[1];
            if (splitentry[0] == "OOCD") configuration.OOCD = splitentry[1];
            if (splitentry[0] == "ASources") configuration.ASources = splitentry[1];
            if (splitentry[0] == "AIncludes") configuration.AIncludes = splitentry[1];
            if (splitentry[0] == "Flowfacts") configuration.Flowfacts = splitentry[1];
            if (splitentry[0] == "DisplayWCET") configuration.DisplayWCET = splitentry[1];
            if (splitentry[0] == "DisplayStack") configuration.DisplayStack = splitentry[1];
            if (splitentry[0] == "SOARICFG") configuration.SOARICFG = splitentry[1];
            if (splitentry[0] == "DisplayBBStatistic") configuration.DisplayBBStatistic = splitentry[1];
            if (splitentry[0] == "CreateCFG") configuration.CreateCFG = splitentry[1];
            if (splitentry[0] == "BBStatistic") configuration.BBStatistic = splitentry[1];
            if (splitentry[0] == "AnalysisScript") configuration.AnalysisScript = splitentry[1];
            if (splitentry[0] == "CFGOutput") configuration.CFGOutput = splitentry[1];

            /* Synchronous file writing (Otherwise problems when adding variables when disconnected)*/
            try {
                fs.writeFileSync(filePath, JSON.stringify(configuration));
            }
            catch (err) {
                console.log(getDateTime() + ": ERROR (write ideconfig): " + err);
                _self.sendResult(0, "writeFileError");
            }
        }

        /* If we want to load an option of the config */
        if (message.operation == "loadConfig" || message.operation == "recoverDebugconfiguration") {
            console.log(getDateTime() + ": Load ideconfig...");
            /* Asynchronous file reading */
            var filePath;
            if (process.env.CONTAINER == "docker") filePath = binaryPath + ".config";
            else filePath = process.env.HOME + binaryPath + ".config";

            var data = fs.readFile(filePath, 'utf8', function (err, data) {
                if (err) {
                    console.log(getDateTime() + ": ERROR (read ideconfig): " + err);
                    var debugconf = new Array();
                    debugconf[0] = "debugconf";
                    debugconf[1] = "XMC4500";
                    platform = "XMC4500";
                    _self.sendResult(0, debugconf);
                }
                else {
                    /* Split data into parts and send it to the client */
                    var config = new Array();
                    var debugconf = new Array();
                    debugconf[0] = "debugconf";

                    var configuration = JSON.parse(data);
                    var preferedHWsent = false;
                    for (var option in configuration) {

                        /* Analysis sources */
                        if (option == "ASources" && message.option == "ASources") {

                            config[0] = "loadConfigASources";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Analysis includes */
                        if (option == "AIncludes" && message.option == "AIncludes") {

                            config[0] = "loadConfigAIncludes";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Flowfacts */
                        if (option == "Flowfacts" && message.option == "Flowfacts") {

                            config[0] = "loadConfigFlowfacts";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Display WCET */
                        if (option == "DisplayWCET" && message.option == "DisplayWCET") {

                            config[0] = "loadConfigDisplayWCET";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Display Stack */
                        if (option == "DisplayStack" && message.option == "DisplayStack") {

                            config[0] = "loadConfigDisplayStack";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Show only analysis results in CFG */
                        if (option == "SOARICFG" && message.option == "SOARICFG") {

                            config[0] = "loadConfigSOARICFG";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Display Basic Block statistics */
                        if (option == "DisplayBBStatistic" && message.option == "DisplayBBStatistic") {

                            config[0] = "loadConfigDisplayBBStatistic";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Create CFG */
                        if (option == "CreateCFG" && message.option == "CreateCFG") {

                            config[0] = "loadConfigCreateCFG";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Set degree of BB statistic */
                        if (option == "BBStatistic" && message.option == "BBStatistic") {

                            config[0] = "loadConfigBBStatistic";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Send analysis script */
                        if (option == "AnalysisScript" && message.option == "AnalysisScript") {

                            config[0] = "loadConfigAnalysisScript";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* Send CFG output */
                        if (option == "CFGOutput" && message.option == "CFGOutput") {

                            config[0] = "loadConfigCFGOutput";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }

                        /* JLink binary path */
                        if (option == "JLink" && message.option == "JLink") {

                            config[0] = "loadConfigJLink";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }
                        /* OOCD binary path */
                        else if (option == "OOCD" && message.option == "OOCD") {

                            config[0] = "loadConfigOOCD";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }
                        /* Targe Side Addresses */
                        else if (option == "TargetSideAddresses" && message.option == "TargetSideAddresses") {

                            config[0] = "loadConfigTargetSideAddresses";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }
                        /* Active Target Side Address */
                        else if (option == "ActiveTargetSideAddress" && message.option == "ActiveTargetSideAddress") {

                            config[0] = "loadConfigActiveTargetSideAddress";
                            config[1] = option + ":" + configuration[option];
                            _self.sendResult(0, config);
                        }
                        /* Target Hardware */
                        if (option == "Target" && message.operation == "recoverDebugconfiguration") {

                            debugconf[1] = configuration[option];
                            _self.sendResult(0, debugconf);
                            preferedHWsent = true;
                        }
                    }
                    /* Target Hardware not selected yet*/
                    if (message.operation == "recoverDebugconfiguration" && preferedHWsent == false) {
                        debugconf[1] = "XMC4500";
                        _self.sendResult(0, debugconf);
                    }

                }
            });
        }

        /* Send fs path of the workspace */
        if (message.operation == "workspacepath") {

            var workspace = new Array();
            workspace[0] = "workspacepath";
            workspace[1] = workspacepath;
            this.sendResult(0, workspace);

        }

        /* If we want to run a terminal command (currently not in use) */
        if (message.operation == "build") {
            //runterminalCommand(message.command,message.params);
            runterminalCommand(message.tcommand, message.params);
        }

        /* Function to parse a string in JSON */
        function isJson(str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        }

        /* Run a terminal comand in form of [command] [params[-C]["Path"]...] */
        function runterminalCommand(terminalCommand, commandParams) {

            var processTerminal;
            var spawn = require('child_process').spawn,
                processTerminal = spawn(terminalCommand, commandParams);

            /* When the process receives data from OOCD */
            processTerminal.stdout.on('data', function (data) {

                var processoutput = new Array();
                processoutput[0] = "commandlineOutput";
                processoutput[1] = data.toString().trim();

                _self.sendResult(0, processoutput);

            });

            /* On error */
            processTerminal.stderr.on('data', function (data) {
                console.log(getDateTime() + ': ERROR (Terminal): ' + data.toString().trim());
            });
            /* On close */
            processTerminal.on('close', function (code) {
                console.log(getDateTime() + ': child process (Terminal runner) exited with code ' + code);

            });

        }

        /* Create child process with GDB */
        function spawnDebugGDB(pathtobin, mode, cb) {

            var spawn, gdb;
            var skip = false;
            var sendStdOut = new Array();
            sendStdOut[0] = "stdout";
            var sendStdErr = new Array();
            sendStdErr[0] = "stderr";
            var currentDebugDirectory = null;
            var countOpen = 0;
            var countClosed = 0;
            var tmpVarValue = "";

            /* Flashing the selected embedded board */
            if (mode == "flash") {
                if (platform == "XMC4500") {

                    spawn = require('child_process').spawn,
                        gdb = spawn('arm-none-eabi-gdb', [pathtobin, '-ex', 'target remote :' + TCP_GDB_EMULATION_PORT, '-ex', 'monitor reset', '-ex', 'load', '-ex', 'monitor reset', '-ex', 'monitor go']);

                    gdb.stdin.write("monitor shutdown\n");
                    gdb.stdin.write("quit\n");
                }
                else {
                    spawn = require('child_process').spawn,
                        gdb = spawn('arm-none-eabi-gdb', [pathtobin]);

                    /* Connect GDB to OOCD */
                    gdb.stdin.write("target remote :" + TCP_GDB_EMULATION_PORT + "\n");
                    /* Halt target */
                    gdb.stdin.write("monitor halt\n");

                    /* Load ELF */
                    gdb.stdin.write("load" + "\n");

                    /* Break in main loop */
                    //gdb.stdin.write("continue\n");
                }
            }
            /* Debug the selected embedded board */
            if (mode == "debug" || mode == "debugstdc") {

                if (platform == "AMD64") {

                    /* Add cmdline parameters */
                    amd64param = ['--args', pathtobin];
                    amd64param.push.apply(amd64param, cmdLineStdCParams);
                    spawn = require('child_process').spawn,
                        gdb = spawn('gdb', amd64param);
                    /* Break in main loop */
                    gdb.stdin.write("break main\n");
                }

                else if (platform == "XMC4500") spawn = require('child_process').spawn,
                    gdb = spawn('arm-none-eabi-gdb', [pathtobin, '-ex', 'target remote :' + TCP_GDB_EMULATION_PORT, '-ex', 'monitor reset', '-ex', 'load', '-ex', 'monitor reset', '-ex', 'break main']);

                //else spawn = require('child_process').spawn,
                //gdb = spawn('arm-none-eabi-gdb',[pathtobin, 'target remote :'+TCP_GDB_EMULATION_PORT, 'monitor halt', 'load', 'break main']);
                else {
                spawn = require('child_process').spawn,
                    gdb = spawn('arm-none-eabi-gdb', [pathtobin]);

                    /* Connect GDB to OOCD */
                    gdb.stdin.write("target remote :" + TCP_GDB_EMULATION_PORT + "\n");
                    /* Halt target */
                    gdb.stdin.write("monitor halt\n");

                    /* Load ELF */
                    gdb.stdin.write("load" + "\n");

                    /* Break in main loop */
                    gdb.stdin.write("break main\n");
                }

                /* Check available Breakpoints */
                for (var i = 0; i < message.breakpoints.length; i++) {

                    /* Add Breakpoints */
                    gdb.stdin.write("break " + message.breakpoints[i].filename + ":" + message.breakpoints[i].line + "\n");
                }
                /* Sleep some time to avoid errors*/
                //gdb.stdin.write("monitor sleep 1000\n");
                /* Start program */

                if (platform != "AMD64") gdb.stdin.write("continue\n");
                else gdb.stdin.write("run\n");
                /* Add debug variables */
                for (var i = 0; i < message.variables.length; i++) {
                    gdb.stdin.write("display " + message.variables[i] + "\n");
                }
            }
            //gdb.stdin.write("monitor reset\n");
            /* When the GDB process receives data from OOCD */
            gdb.stdout.on('data', function (data) {
                /* Split the incoming data for "\n" */
                var splitdata = (data.toString().trim()).split("\n");
                var variableresult = new Array();
                var tmpWorkspace;
                var tmpDirectory;
                var stepLineNumber = new Array();
                var tmpLineNumber;
                var notMeaningful;

                /* Send stdout stream back to browser */
                sendStdOut[1] = splitdata;
                _self.sendResult(0, sendStdOut);

                /* Initialize arrays for further transmission */
                variableresult[0] = "variableValue";
                stepLineNumber[0] = "atFileLine";
                //console.log("===================================BEGIN===========================================");
                /* Loop through the splitted data */
                for (var i = 0; i < splitdata.length; i++) {
                    //console.log("Debugprocess: "+splitdata[i]+"\n");
                    skip = false;

                    if (splitdata[i].indexOf("Transfer rate:") > -1 && mode == "flash") {
                        _self.sendResult(0, "firmware-flashing-success");

                    }

                    if (splitdata[i].indexOf("exited with code") > -1) {

                        _self.sendResult(0, "gdb-exited");

                    }

                    if (splitdata[i].indexOf("exited normally") > -1) {

                        gdb.stdin.write("quit\n");

                    }

                    if (splitdata[i].indexOf("Program terminated") > -1) {

                        gdb.stdin.write("quit\n");

                    }

                    if (splitdata[i] == "Program received signal SIGINT, Interrupt." && exitDebugger == true) {
                        gdb.stdin.write("quit\n");

                    }
                    if (splitdata[i] == "Program received signal SIGTRAP, Trace/breakpoint trap." && exitDebugger == true) {

                        gdb.stdin.write("quit\n");
                        gdb.stdin.write("quit\n");
                    }

                    /* If the splitted data matches "[From the Beginning of the string]<number><Spaces only>" add it to the array
                     * (Current line when stepping or reaching a breakpoint) */
                    tmpLineNumber = splitdata[i].match(/^[0-9]+\t/);
                    /* Send result if not null */
                    if (tmpLineNumber != null) {
                        tmpLineNumber = tmpLineNumber.toString().trim();
                        /* Add current debug directory path to the line number */
                        stepLineNumber[1] = currentDebugDirectory + ":" + tmpLineNumber;
                        /* Send the result back to the client */
                        _self.sendResult(0, stepLineNumber);
                        skip = true;

                    }


                    /* If the splitted data matches "<filename>.<c/h/asm..>:<line>" get the current debug file path */
                    if (skip == false) {
                        tmpWorkspace = splitdata[i].match(/\s[A-Za-z0-9\_\-\/\.]+\.[A-Za-z]+:[0-9]+/);
                        if (tmpWorkspace != null) {
                            tmpDirectory = tmpWorkspace.toString().trim();
                            currentDebugDirectory = tmpDirectory.substring(0, tmpDirectory.indexOf(":"));
                            skip = true;
                        }
                    }

                    /*If the splitted data matches "<space><variable><space>=<space><value>" (Inspect Variables) */
                    if (skip == false) {
                        variableresult[1] = splitdata[i].match(/[A-Za-z0-9_]+\s=\s.+/);
                        //variableresult[1] = splitdata[i].match(/[0-9]+: ([A-Za-z0-9_]+) = ()/);
                        if (countOpen != countClosed) variableresult[1] = splitdata[i];
                        /* FIX: GDB Server may break up the response by \n
                         * Therefore the number of brackets will be counted for arrays and structs */
                        if (variableresult[1] != null) countOpen = countOpen + (variableresult[1].toString().trim().match(/{/g) || []).length;
                        if (variableresult[1] != null) countClosed = countClosed + (variableresult[1].toString().trim().match(/}/g) || []).length;
                        //if (variableresult[1] != null)console.log("Data:\n"+data.toString().trim()+"\nEND\n");
                        //if (variableresult[1] != null)console.log("Regex:\n"+variableresult[1]+"\nEND\n");
                        //if (variableresult[1] != null)console.log("CountO:\n"+countOpen+"\nEND\n");
                        //if (variableresult[1] != null)console.log("CountC:\n"+countClosed+"\nEND\n");
                        /* Send the result if not null and the count on brackets matches*/
                        if (variableresult[1] != null && countOpen == countClosed) {
                            countOpen = 0;
                            countClosed = 0;
                            /* Add tmp value from previous run */
                            if (tmpVarValue != "") {
                                variableresult[1] = tmpVarValue + " " + variableresult[1];
                                _self.sendResult(0, variableresult);
                            }
                            /* Otherwise send result */
                            else _self.sendResult(0, variableresult);
                            tmpVarValue = "";
                        }
                        /* If the count does not match the response is splited. => Save current response */
                        if (variableresult[1] != null && countOpen != countClosed) {
                            tmpVarValue = tmpVarValue + variableresult[1];
                        }
                        skip = true;
                    }
                }

                //console.log("===================================END===========================================");
            });

            /* On error */
            gdb.stderr.on('data', function (data) {
                console.log(getDateTime() + ': child process (Debug GDB) error code ' + data);
                /* Send error stream back to browser */
                sendStdErr[1] = (data.toString().trim()).split("\n");
                _self.sendResult(0, sendStdErr);
                if (data.toString().trim() == "Remote connection closed") gdb.stdin.write("quit\n");
                if (data.toString().trim() == "\"finish\" not meaningful in the outermost frame.") _self.sendResult(0, "finish-not-meaningful");
            });
            /* On close */
            gdb.on('close', function (code) {
                console.log(getDateTime() + ': child process (Debug GDB) exited with code ' + code);
                _self.sendResult(0, "gdb-exited");
                gdbProcess = null;
                exitDebugger = false;
                lockGDB = 0;
                /* Close the socket manually if the GDB does not do this on its own */
                if (clientGDBemusocket[0] != undefined) {
                    clientGDBemusocket[0].end();
                    clientGDBemusocket[0].destroy();
                    clientGDBemusocket.splice(clientGDBemusocket.indexOf(clientGDBemusocket[0]), 1);
                }
            });
            /* Callback for the GDB process object for outter use */
            cb(gdb);
        }

        return true;
    };


}).call(EmbeddedDeveloperToolsPlugin.prototype);