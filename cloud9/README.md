# Cloud9 IDE

**This is a fork of the popular Cloud9 IDE due to restrictive licensing of Cloud9v3. It already includes some small patches for known bugs. As of 14th of February 2015 with a commit that can no longer be linked to, the upstream author Cloud9 IDE, Inc stated that the Cloud9 v2 would no longer be maintained. The original repository issue tracker was closed and notifications were given that the project is superseded by [Cloud9 v3 SDK](https://github.com/c9/core/) with some substantial changes in licensing terms driven by alignment of business goals. The distributed SDK is meant for plugin development and the core of the product is [no longer licensed as Open Source Software](http://cloud9-sdk.readme.io/v0.1/docs/the-licenses-for-cloud9-sdk-and-packages). Nevertheless the license allows the SDK version to be used as a personal editor. However, it is strictly prohibited to use the SDK to build or offer a service and to make the SDK version easily available to anyone else besides yourself. Contributions are always welcome.**

Cloud9 is an open source IDE built with [Node.JS] on the back-end and JavaScript/HTML5 on the client.
It is very actively maintained by about 20 developers in both Amsterdam and San Francisco and is one
component of the hosted service at [c9.io](http://c9.io). The version available here runs on your local system.

Cloud9 balances the power of traditional desktop IDEs with the simplicity and elegance of editors
like TextMate and Sublime.

Cloud9 is built entirely on a web stack, making it the most hacker-friendly IDE today.
Fork it, hack it, and if you think others would benefit, issue a pull request on this repo
and we'll take a look. If you have any questions, meet us in #cloud9ide on irc.freenode.net
or ask us on Twitter [@Cloud9IDE](http://twitter.com/#!/Cloud9IDE).

Happy Coding!

## Features

  * High performance ACE text editor with bundled syntax highlighting support for JS, HTML, CSS and mixed modes.
  * Integrated debugger for [Node.JS] applications with views of the call stack, variables, live code execution and live inspector
  * Advanced Javascript language analysis marking unused variables, globals, syntax errors and allowing for variable rename
  * Local filesystem is exposed through [WebDAV](http://en.wikipedia.org/wiki/WebDAV) to the IDE, which makes it possible to connect to remote workspaces as well
  * Highly extensible through both client-side and server-side plugins
  * Sophisticated process management on the server with evented messaging

## Browser Support

We support the newer versions of Chrome, Firefox and Safari.

## Additional features

- Standard C-Development
- Embedded C-Development
- Code analysis tools
- CFG viewer
- Project exporter
- Unarchiever
- Several bugfixes
- ...


## Additional features by [exsilium](https://github.com/exsilium)

The IDE includes additional features and bugfixes borrowed from [Cloud9 IDE v2 by exsilium](https://github.com/exsilium/cloud9)

- Modern node support (NodeJS >= 0.10+)
- Up to date dependencies and compatibility fixes
- Terminal

## Installation and Usage

If installing on Windows, please refer to [Installation on Windows](#installation-on-windows-experimental).

Requirements:

  * NodeJS `>= 0.10.0`
  * NPM `>= 1.1.16`
  * n (sudo npm install -g n)
  * mercurial (yum install hg, apt-get install mercurial)
  * git
  * libxml2-dev
  * curl
  * build-essential
  * g++

Embedded Tools:

  * gcc-arm-none-eabi
  * gdb-arm-none-eabi (apt-get -o Dpkg::Options::="--force-overwrite" install gdb-arm-none-eabi)
  * Moreover depending on the target platform, respective On-Chip Debug System software (OpenOCD, JLink GDB Server) is required. While a
    patched version of OpenOCD for the "TI TM4C1294XL" is distributed with this repository (64-Bit deb & rpm packages), other options have to be built from source. In this case follow the README in the OCDS_Software/openocd-VERSION directory. Replace the "make install" command with "checkinstall" if you want to create a package instead of directly copying the files into the system folders for easier removal.
    JLink GDB Server can be downloaded from https://www.segger.com/jlink-software.html

Install:

    git clone https://github.com/jhausladen/cloud9.git
    cd cloud9
    npm install

The above install steps create a `cloud9` directory with a `bin/cloud9.sh`
script that can be used to start Cloud9:

    bin/cloud9.sh

Optionally, you may specify the directory you'd like to edit:

    bin/cloud9.sh -w ~/git/myproject

Cloud9 will be started as a web server on port `-p 3131`, you can access it by
pointing your browser to: [http://localhost:3131](http://localhost:3131)

By default Cloud9 will only listen to localhost.
To listen to a different IP or hostname, use the `-l HOSTNAME` flag.
If you want to listen to all IP's:

    bin/cloud9.sh -l 0.0.0.0

If you are listening to all IPs it is adviced to add authentication to the IDE.
You can either do this by adding a reverse proxy in front of Cloud9,
or use the built in basic authentication through the `--username` and `--password` flags.

    bin/cloud9.sh --username leuser --password c9isawesome

Run:

For testing someone can simply run:

    ./start-cloud9.sh

from the command-line in the top-level directory.

Cloud9 is compatible with all connect authentication layers,
to implement your own, please see the `plugins-server/cloud9.connect.basic-auth` plugin
on how we added basic authentication.

## Installation on Windows (experimental)

If you're running Cloud9 on Windows you'll have to follow these steps as well:

  * Install [Grep for Windows](http://gnuwin32.sourceforge.net/downlinks/grep.php)
  * Add `C:\Program Files (x86)\GnuWin32\bin` to your [PATH](http://www.computerhope.com/issues/ch000549.htm)
  * Open a new instance of `cmd` with elevated rights (right click 'Run as adminstrator')
  * Now follow the steps under 'Install'
  * *Please note that the `npm install` fails due to a libxml error, but you can ignore that for now.*

To start Cloud9, please don't start through `bin/cloud9.sh` but rather via:

    node server.js [args]

Please note that there will be errors displayed regarding the `find` command,
and that some features might not work.
Feel free to improve the Windows experience and open a pull request.

## Updating

To update to the latest version (if this doesn't work, just make a fresh clone):

    git pull
    npm update

`npm update` does not currently install missing dependencies. To do so use:

    npm install

## Open Source Projects Used

The Cloud9 IDE couldn't be this cool if it weren't for the wildly productive
[Node.JS] community producing so many high quality software.
Main projects that we use as building blocks:

  * [async.js] by [fjakobs]
  * [jsDAV] by [mikedeboer]
  * [connect] by [senchalabs](http://github.com/senchalabs)
  * [engine.io] by [LearnBoost](http://github.com/LearnBoost)
  * [smith.io](http://github.com/c9/smith.io) by [creationix](http://github.com/creationix) & [cadorn](http://github.com/cadorn)
  * [ace](http://github.com/ajaxorg/ace) by [fjakobs]
  * [apf](http://www.ajax.org) by [ajax.org]
  * and of course [Node.JS]!

Thanks to all developers and contributors of these projects!

[fjakobs]: http://github.com/fjakobs
[javruben]: http://github.com/javruben
[mikedeboer]: http://github.com/mikedeboer
[ajax.org]: http://www.ajax.org/
[async.js]: http://github.com/fjakobs/async.js
[jsDAV]: http://github.com/mikedeboer/jsdav
[connect]: http://github.com/senchalabs/connect
[engine.io]: http://github.com/LearnBoost/engine.io
[requireJS]: http://requirejs.org/
[Node.JS]: http://nodejs.org/

## License

The GPL version 3, read it at [http://www.gnu.org/licenses/gpl.txt](http://www.gnu.org/licenses/gpl.txt)

## Contributing

Cloud9 wouldn't be where it is now without contributions. Feel free to fork and improve/enhance Cloud9 in any way your want. If you feel that the Cloud9 community will benefit from your changes, please open a pull request.