# Debug-Control Service

This part of the repository hosts the source code of the Debug-Control Service used to handle various on-chip debug system software such as OpenOCD or JLink GDB server. Pre-built binaries for Linux, macOS and Windows can be obtained via [Google Drive](https://drive.google.com/open?id=0B5eRiAuqb80jcnRQdGpYOFVmdkk). The service itself is written in Java and uses JavaFX for the UI components. Moreover it connects to the cloud server for debugging the embedded development boards as well as communicates with the Web IDE in the browser via WebSockets. The default port for the WebSocket connection is `8080`.

## Requirements

  * Ant
    * On Mac OS X install via Homebrew (Requires XCode & Command Line Tools)
  * JDK `Java 8 >= 8u101` (Add to `JAVA_HOME` path)
    * Recommended: Oracle JDK (http://www.oracle.com/technetwork/java/javase/downloads/index.html) as long as JavaFX is not distributed with OpenJDK
  * usbutils (Linux)
  * Monocle (Headless mode for HaaS setup)
    * The headless mode implementation for JavaFX is not included in the current JDK releases and has therefore to be added manually
    * Copy `software/OpenJFX_Monocle/openjfx-monocle-8uXX-XXX.jar` to `JDK/jre/lib/ext/` directory
    * The sources for building Monocle libraries reside in `software/OpenJFX_Monocle/Monocle/`   

Linux:

  * Debian packaging tools `build-essential` (DEB)
  * RPMBuild (RPM)

Mac OS X:

  * Out of the box (DMG)

Windows:

  * WIX toolset (MSI)
  * Inno Setup (EXE)

The development flow for the Debug-Control Service uses two different Java IDEs. For general programing and debugging the Debug-Control Service, one uses the IntelliJ IDEA, as it provides some convenient features that can't be found in other IDEs. This project is located at "DebugControlService/Java/DebugControlService"

When it comes to the deployment of the native software packages this project uses Ant builds (DebugControlService/Java/efxclipse). For ease of use one can install the JavaFX enabled version of eclipse (efxclipse), import the project and run the corresponding "build.xml/build_headless.xml" in the "build" folder as Ant task (Don't forget to refresh the project as source files may have changed). 

The output format such as ".exe", ".dmg", ".deb", ".rpm" can be changed within the XML file. The program version can be changed by adjusting the version option of the fx:application id="fxApplication" attribute. The application icon is located in the build/package/\<platform\> directory. Resulting packages are located in the "build/deploy/bundles" directory.

The build.xml file uses the default build options which include the UI. This configuration is used for programing/debugging on a local computer. The build_headless.xml option is used for Docker containers ran as HaaS setup on the server within the container. Therefore no UI components are necessary as required information such as serial numbers, ports are predefined in config files. As the current Docker setup uses a LTS version of Ubuntu (64-Bit as everything in Docker is x86_64) the native package for the headless mode requires a 64-Bit Debian package (.deb). 

## Installation and Usage

Build directories & files:

    software/DebugControlService/Java/efxclipse/DebugControlService/build/
    software/DebugControlService/Java/efxclipse/DebugControlService/build/build.xml
    software/DebugControlService/Java/efxclipse/DebugControlService/build/build_headless.xml
    software/DebugControlService/Java/efxclipse/DebugControlService/build/deploy/bundles/

Output format (build.xml):

    outfile="DebugControlService" nativeBundles="deb"

Program version (build.xml):

    <fx:application id="fxApplication"
        name="DebugControlService"
        mainClass="at.embsys.sat.Main"
        version="1.0"
    />

Build Debug-Control Service:
 
    ant [-buildfile <build.xml/build_headless.xml>]

The Debug-Control Service provides optional start-up parameters that can overwrite the default values:

    DebugControlService -s <Serial/universal> -e <Websocketport> -j <JLinkport> -o <OOCDport> -sj <StartJLink[ON=1/OFF=0]> -so <StartOOCD[ON=1/OFF=0]> -m <Platform[XMC4500]/[TM4C1294XL]> -wsscert <Keystorepath>

Log files are saved in the user's home directory in:

    "~/.debugcontrolservice/jlink.log" 
    "~/.debugcontrolservice/oocd.log"

The supervisor log files can be found in:

    "/var/log/supervisor/debugcontrolservice<serial>.log
    "/var/log/supervisor/debugcontrolservice<serial>_errors.log