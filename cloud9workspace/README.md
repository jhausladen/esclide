# Define custom project configuration

The ".config" file located at the top-level of a project folder holds configuration options that can be different for every project. For example breakpoints are saved per workspace, as well as the location of the target-side, which may either be local or anywhere else on the web. Also the controller selected by default or analysis settings can be configured within this file and change per project. If a configuration file is found within a project the settings specified within overwrite the default ones. The syntax used for the configuration file is JSON. The structure of a simple configuration file is shown below:

    {
     "Target":"TM4C1294XL",
     "ActiveTargetSideAddress":"cloud-emb.technikum-wien.at",
     "breakpoints":""
    }

# Example projects

This part of the repository also hosts various example projects that can be used with the Cloud9 IDE. For an existing project ported to Cloud9 the following requirements are mandatory:

## XMC4500 & TM4C1294XL

### File Structure :

The project has to be in a certain structure so that Cloud9 finds all necessary files. In general every folder underneath the top-level folder can be used to structure the workspace and can have several subfolders. Moreover every project folder has to contain the source code on top-level within a folder named "src" and the generated binaries within a folder named "bin". Every folder implementing this scheme is considered a project. On top of the project folder there also has to be a makefile which has to fulfill the requirements listed below.

### Makefile:

  * The target name (TARGET) hast to be "firmware"
  * The extension has to be ".elf"
  * A "clean" rule that removes the generated files within the "bin" folder of the project.
  * Add debug symbol option "-g" to your CFLAGS to enable debug support
  * Disable compiler optimizations when debugging
      * Newer gcc versions support "-Og" which will optimize the program but does not interfere debugging

## Standard C

### File Structure :

Same as with XMC4500 & TM4C1294XL.

### Makefile:

  * The target name (TARGET) including the file extension has to be "a.out"
  * A "clean" rule that removes the generated files within the "bin" folder of the project.
  * Add debug symbol option "-g" to your CFLAGS to enable debug support

