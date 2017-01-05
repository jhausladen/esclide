var netutil = require("netutil");
var connect = require("connect");
var router = require("urlrouter");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var query = require("./middleware/query");
var https = require("https");
var fs = require("fs");
var httpolyglot = require('httpolyglot');
var path = require("path");
var mime = require('mime');

module.exports = function startup(options, imports, register) {
    imports.log.info("connect plugin start");

    /* Retrieve location of cloud9 workspace */
    var cloud9workspace;
    process.argv.forEach(function (val, index, array) {
        console.log(index + ': ' + val);
        if(val == '-w'){
            cloud9workspace = array[index+1];
        }
    });

    /* Read config file which holds UID & GID of the process running cloud9 */
    var id = fs.readFileSync('/cloud9/id.conf').toString().split(":",2);
    var uid = id[0];
    var gid = id[1];

    /* Create https options holding the certificates */
    var httpsoptions = {
        key:    fs.readFileSync('/etc/letsencrypt/live/cloud-emb.technikum-wien.at/privkey.pem'),
        cert:   fs.readFileSync('/etc/letsencrypt/live/cloud-emb.technikum-wien.at/fullchain.pem'),
    };

    /* Drop root privileges as we don't need them anymore */
    process.setgid(uid);
    process.setuid(gid);

    var server = connect();
    /* Check that all requests are secure https connections */
    server.use(function(req, res, next){
        if (!req.socket.encrypted) {
            /* Modify header to redirect to https version and end request */
            res.writeHead(301, { 'Location': 'https://'+req.headers.host});
            return res.end();
        }
        /* If the URL includes the export/download string, look for the file and pipe it back */
        if (req.url.indexOf("/export?") > -1) {
            var file = req.url.replace("/export?/workspace/", '');

            /* Get the path to the main workspace folder */
            var pathtoworkspace = cloud9workspace + "/"; //+"/bin/" for standard C, remove "/"

            /* Get the full path to the file */
            file = pathtoworkspace + file;

            var filename = path.basename(file);
            /* Get mimetype of file */
            var mimetype = mime.lookup(file);
            /* Set response headers */
            res.setHeader('Content-disposition', 'attachment; filename=' + filename);
            res.setHeader('Content-type', mimetype);
            /* Create filestream and pipe to client */
            var filestream = fs.createReadStream(file);
            /* Wait until we know the readable stream is actually valid before piping */
            filestream.on('open', function () {
                /* Pipes the read stream to the response object (which goes to the client) */
                filestream.pipe(res);
            });
            /* Catch any errors that happen while creating the readable stream (usually invalid names) */
            filestream.on('error', function (err) {
                console.log(getDateTime() + ': File download error: ' + err);
            });
        }
        /* Process next request */
        next();
    });


    var hookNames = [
        "Start",
        "Setup",
        "Main",
        "Session",
        "Auth",
        "Error"
    ];
    var api = {
        getModule: function() {
            return connect;
        },
        getRouter: function() {
            return router;
        },
        /* The query() is backported from Connect 2.x branch because the IDE
           relies on req.query to be populated. This does just that with the
           help of qs and parseurl
         */
        query: function() {
            return query();
        }
    };
    hookNames.forEach(function(name) {
        var hookServer = connect();
        server.use(hookServer);
        api["use" + name] = function() {
            hookServer.use.apply(hookServer, arguments);

            var route = hookServer.stack[hookServer.stack.length-1];

            // return "unuse"
            return function() {
                var i = hookServer.stack.indexOf(route);
                if (route >= 0) {
                    console.log("unuse", hookServer.stack[i])
                    hookServer.stack.splice(i, 1);
                }
            };
        };
    });

    api.useSetup(cookieParser());
    api.useSetup(bodyParser.json());

    if (options.serverId) {
        api.useSetup(function (req, res, next) {
            res.setHeader("X-C9-Server", options.serverId);
            next();
        });
    }

    api.addRoute = server.addRoute;
    api.use = api.useStart;
    api.serverUse = server.use.bind(server);

    api.on = server.on.bind(server);
    api.emit = server.emit.bind(server);

    function startListening (port, host) {
        api.getPort = function () {
            return port;
        };
        api.getHost = function () {
            return host;
        };

        var getListen = httpolyglot.createServer(httpsoptions,server).listen(port, host, function(err) {
            if (err)
                return register(err);

            imports.log.info("Connect server listening at http://" + host + ":" + port);

            register(null, {
                "onDestruct": function(callback) {
                    server.close();
                    server.on("close", callback);
                },
                "connect": api,
                "http": {
                    getServer: function() {
                        return getListen;
                    }
                }
            });
        });
    }

    if (options.port instanceof Array) {
        netutil.findFreePort(options.port[0], options.port[1], options.host, function(err, port) {
            if (err)
                return register(err);

            startListening(port, options.host || "localhost");
        });
    } else {
        startListening(options.port, options.host || "localhost");
    }
};
