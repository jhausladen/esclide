# Embedded Systems Cloud IDE

This repository hosts a cloud-based integrated development environment for the development of embedded systems software. The entire tool-chain is hosted in the cloud and provides a fast an easy way of coding in the C programming language. The IDE is targeting embedded systems but can also be used for general-purpose system programming among Linux or even teaching Linux basics via the integrated terminal. The benefit is that also low-level flashing and debugging of hardware is supported by any device capable of running a modern web browser, without the setup and configuration hassles of bloated proprietary vendor specific IDEs. Furthermore it provides a consistent UI across all operating systems.

All the development tools (compiler, version management, debugger) are hosted on a cloud server and allow building of software for target devices. The hardware needs to be available on the target-side that is either "in the cloud" or connected to the client. On the target-side only a minimal set of tools is mandatory to enable interfacing between the target hardware and the development tools on the server. On the client-side a standard web browser suffices.

### HaaS

One way to set up the IDE is to provide the development platform as a service in a cloud environment. In this case the user just logs into the IDE with the help of a modern web-browser and can program the development board connected to the server hosting the IDE instance. The OCDS software as well as the debug-control service used for interacting with the hardware are both set up automatically within the corresponding Docker container. In our setup the development platform is tied directly to the IDE instance based on the serial number of the hardware. The WebSocket address specified in the cloud IDE has to be set to the address of the server. For every project these addresses can be set in the appropriate [configuration file](cloud9workspace/README.md) or from the UI if the "NOOB" mode is not explicitly enabled.

### Universal

The second way the cloud IDE can be set up is in universal mode. As the name suggests, in this setup, the target platform is connected to any computational device located anywhere on the Internet or local network infrastructure with access to the server. In comparison to the HaaS setup, the universal setup requires the OCDS software and the debug-control service to be running on the computational device the hardware is connected. The WebSocket address specified in the cloud IDE has to be set to "Local" when the cloud IDE is used on the same device the debug-control service is running. If the hardware and debug-control service are located somewhere different from the web-browser used for programing, the WebSocket address has to match the address of the device the debug-control service is running. 

## Requirements

### Operating System:

  * Server setup (Tested on Debian-based systems: Debian 8, Ubuntu 14.04 LTS, Ubuntu 16.04 LTS)
  * Debug-Control Service (Independent)

#### Encryption using Let's Encrypt

  * Valid [Let’s Encrypt](https://letsencrypt.org/) certificates at `/etc/letsencrypt/` to be mounted by each Docker container with, e.g., [certbot](https://certbot.eff.org/)
    
        sudo apt-get install certbot [-t jessie-backports]
        certbot certonly --standalone -d example.com
  * Adapt the path to the private key and certificate (`/etc/letsencrypt/live/<domain>/privkey.pem`) in `cloud9/plugins-server/connect/connect-plugin.js` and `cloud9/plugins-server/cloud9.ide.embeddeddeveloper/embeddeddevelopertools.js` to reflect your domain
  * Copy the `convert_letsencrypt_jks.sh` script to the `/usr/bin/` folder and adapt the configuration to your setup
  * Run the `convert_letsencrypt_jks.sh` script to create the `keystore.jks` file in `/etc/letsencrypt/`
  * Regularly update the certificates with a Cron job issued by root:

        sudo crontab -e
        0 0 * * * /usr/bin/certbot renew --post-hook "/usr/bin/convert_letsencrypt_jks.sh && docker restart $(docker ps -a -q)" > /var/log/certbot/certbot.log 2>&1 

#### Encryption using self-signed certificates (OpenSSL)

Self-signed certificates should be used for testing without a valid domain or private use **ONLY**! 

  * Create `/etc/letsencrypt` as root
  * Create a private key and the self-signed certificate within `/etc/letsencrypt`:
      
        openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out certificate.pem
  
  * Adapt the path to the private key and certificate (`/etc/letsencrypt/live/<domain>/privkey.pem`) in `cloud9/plugins-server/connect/connect-plugin.js` and `cloud9/plugins-server/cloud9.ide.embeddeddeveloper/embeddeddevelopertools.js` to reflect the location of your certificates.
  
  * Add the OpenSSL certificate (`fullchain.pem`) to the truststore of the JDK (`$JAVA_HOME/jre/lib/security/cacerts`) that is used for building the debug-control service. The truststore password is `changeit` by default but should be modified for production use so no unauthorized certificates can be loaded into the application by third parties.

        keytool -import -noprompt -trustcacerts -alias <AliasName> -file   <certificate> -keystore <KeystoreFile> -storepass <Password>

  One can also add the certificate to an already installed debug-control service. E.g., on Debian-based Linux distributions the truststore of the JDK bundled with the debug-control service is located at `/opt/DebugControlService/runtime/lib/security/cacerts`.

### Build Tools ([Debug-Control Service](software/README.md)):

Only reuired in case the debug-control service is built from source. Pre-built binaries for Linux, macOS and Windows can be obtained via [Google Drive](https://drive.google.com/open?id=0B5eRiAuqb80jcnRQdGpYOFVmdkk)

  * Ant
    * On Mac OS X install via Homebrew (Requires XCode & Command Line Tools)
  * JDK `Java 8 >= 8u101` (Add to `JAVA_HOME` path)
    * Recommended: Oracle JDK ([http://www.oracle.com/technetwork/java/javase/downloads/index.html](http://www.oracle.com/technetwork/java/javase/downloads/index.html)) as long as JavaFX is not distributed with OpenJDK
  * Monocle (Headless mode for HaaS setup)
    * The headless mode implementation for JavaFX is not included in the current JDK releases and has therefore to be added manually
    * Copy `software/OpenJFX_Monocle/openjfx-monocle-8uXX-XXX.jar` to `JDK/jre/lib/ext/` directory
    * The sources for building Monocle libraries reside in `software/OpenJFX_Monocle/Monocle/`
  * Debian packaging tools `build-essential` (DEB)

### Embedded Tools:

  * Depending on the target platform, respective On-Chip Debug System software (OpenOCD, JLink GDB Server) is required. While a
    patched version of OpenOCD for the "TI TM4C1294XL" is distributed with this repository (64-Bit debian package), other options have to be built from source. 
    In this case follow the README(s) in the ["OCDS_Software"](OCDS_Software/README.md) and ["OCDS_Software/openocd"](OCDS_Software/openocd/README) directory. Replace the "make install" command with "checkinstall" if you want to create a package 
    instead of directly copying the files into the system folders for easier removal.
  * JLink GDB Server can be downloaded from [https://www.segger.com/jlink-software.html](https://www.segger.com/jlink-software.html) 
  * For HaaS setups place the 64-Bit DEB installer in the "OCDS_Software" folder.

### Additional components for Docker setup:

  * docker
  * python, python-pip & wget module (pip install wget)
  * usbutils (Linux)

### Network Infrastructure:

  * One free port per cloud IDE instance for standard C development
  * One additional free port per cloud IDE instance for embedded development platform support

### Supported development platforms:

  * Infineon XMC4500 Relax/Relax Lite Kit
  * TI Tiva C Series TM4C1294 Connected LaunchPad

## Installation and Usage

Clone the repository recursively:
    
    git clone --recursive https://github.com/jhausladen/esclide.git

The automatic install-script will use Docker for creating independent containers (recommended). Simply run:

    python docker_container.py -n <Name> -w <Workstationname> -u <Username> -k <Password> -p <IDE Port> [Optional: -c <Setup Configuration> -d <Debug Port> -e <Websocket Port> -m <Target> -s <Serial> -r <Projects> -j <ON/JLink Port> -o <ON/OOCD Port> -b <Enable NOOB Mode>]

The following options are given:

    -n/--name                 Name of Docker container
    -w/--workstationname      Name of the workstation hosting the service 
    -u/--user                 Username for the created workspace
    -k/--password             Password for the created workspace
    -s/--serial               Serial number of hardware connected to container
    -p/--port                 Cloud IDE port (default: 3131/[configs/supervisor_config/cloud9.conf])
    -d/--debugport            Debug Port for GDB data (default: 4445/[configs/debugport.conf])
    -c/--config               Configuration file to autonomously set up several cloud IDE instances (configs/cloudsetup_config/)
    -e/--websocket            WebSocket port for the client-side connection to the target-side (default: 8080/[configs/wsport.conf])
    -m/--target               Target platform (XMC4500/TM4C1294XL)
    -r/--projects             Specifies projects that are copied to the workspace during setup (projects must reside within the build context of the Dockerfile)
    -j/--jlinkport            Enable JLink/Custom JLink GDB server port (default: 2331/[configs/supervisor_config/debugcontrolservice.conf])
    -o/--oocdport             Enable OpenOCD/Custom OpenOCD port (default: 3333/[configs/supervisor_config/debugcontrolservice.conf])
    -b/--noob                 Enable NOOB Mode (default: 0/[configs/noob.conf])
    -h/--help                 Show command line options (optional)

The structure and management of cloud IDE instances is described in the [configs](configs/README.md)/[docker_config](configs/docker_config/README.md) README.

## Example Setup

One can easily setup the cloud IDE with the help of [configuration files](configs/cloudsetup_config/README.md):

    python docker_container.py -c <Setup Configuration>

In case of a HaaS setup the development platform is connected to the server and the debug-control service will be ran directly within the Docker container beside the cloud IDE. The following command sets up a HaaS setup for the XMC4500:

    python docker_container.py -n <Name> -w <Workstationname> -u <Username> -k <Password> -p <IDE Port> -e <Websocket Port> -s <Serial> -j ON -m XMC4500

If the debug-control service is supposed to run on any suitable computational device with a connected development board, a simple setup would look like this:

    python docker_container.py -n <Name> -w <Workstationname> -u <Username> -k <Password> -p <IDE Port> -d <Debug Port>

This setup also requires the corresponding OCDS software to be installed on the host running the Debug-Control Service and a suitable development-platform attached.
For building, installation an usage of the debug-control service outside of the HaaS setup please refer to the [Debug-Control Service README.](software/README.md)

WARNING: If the JLink Port & OOCD Port are not turned off, the debug-control service within the container could establish a connection to the cloud IDE before the local debug-control service that is used for debugging the local hardware!

## Acknowledgment
This work has been conducted in the context of the public funded R&D project Software Analysis Toolbox managed by the Vienna City Council MA23.