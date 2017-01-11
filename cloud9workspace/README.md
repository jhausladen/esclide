# Example projects

This part of the repository also hosts various example projects that can be used with the Cloud9 IDE. For an existing project ported to Cloud9 the following requirements are mandatory:

## File Structure :

The project has to be in a certain structure so that Cloud9 finds all necessary files. In general every folder underneath the top-level folder can be used to structure the workspace and can have several subfolders. Moreover every project folder has to contain the source code on top-level within a folder named `src` and the generated binaries within a folder named `bin`. Every folder implementing this scheme is considered a project. On top of the project folder there has to be a makefile which has to fulfill the following requirements:

### Standard C Makefile

  * The target name (TARGET) including the file extension has to be `a.out`
  * A `clean` rule that removes the generated files within the `bin` folder of the project.
  * Add debug symbol option `-g` to your `CFLAGS` to enable debug support

### XMC4500 & TM4C1294XL Makefile

  * The target name (TARGET) hast to be `firmware`
  * The extension has to be `.elf`
  * A `clean` rule that removes the generated files within the `bin` folder of the project.
  * Add debug symbol option `-g` to your CFLAGS to enable debug support
  * Disable compiler optimizations when debugging
      * Newer gcc versions support `-Og` which will optimize the program but does not interfere debugging

Example projects with predefined makefiles can be found in ``cloud9workspace`` and `analysis_tools/ARMv7t-WCET-Analysis/examples` folders.
## Create a custom project configuration

The `.config` file located at the top-level of a project folder holds configuration options that can be different for every project. For example breakpoints are saved per workspace, as well as the location of the target-side, which may either be local or anywhere else on the web. Also the controller selected by default or analysis settings can be configured within this file and change per project. If a configuration file is found within a project the settings specified within overwrite the default ones. The syntax used for the configuration file is JSON. The structure of a simple configuration file is shown below:

    {
     "Target":"TM4C1294XL",
     "ActiveTargetSideAddress":"cloud-emb.technikum-wien.at",
     "breakpoints":""
    }

The project config can have the following entries:
    
`Target` Specifies the development platform for this project (XMC4500 or TM4C1294XL)

`TargetSideAddresses` Specifies all available web addresses where the debug-control service is located in the form of `address1,address2,adddress3, ...`

`ActiveTargetSideAddress` Specify the active web address where the debug-control service is located. For local development set this to `Local`

`JLink` Holds the path to the JLinkGDBServer executable

`OOCD` Holds the path to the OpenOCD executable

`breakpoints` Holds the breakpoints of the project in the form of `/workspace/<filepath>:<line number>, ...` 

`debugvariables` Holds the debug variables of the project in the form of `var1:var2:var3: ...`

`AnalysisFunctions` Holds the functions used for the WCET analysis in the form of `function1:function2:function3: ...`

`ASources` Holds the relative path starting from the analysis folder to the source files used for WCET analysis in the form of `-s ../src/\<filepath1\> -s ../src/\<filepath2\> -s ../src/\<filepath3\> ...`

`AIncludes` Holds the relative path starting from the `analysis` folder to the include folders for the WCET analysis in the form of `-I sys -I ../inc ...`

`Flowfacts` Holds the relative path to the `flowfacts.ffx` starting from the `analysis` folder `./flowfacts-ffx`

`DisplayWCET` Holds a boolean either `true` or `false` to enable/disable WCET result

`DisplayStack` Holds a boolean either `true` or `false` to enable/disable Stack usage result

`SOARICFG` Holds a boolean either `true` or `false` to enable/disable analysis results in the control flow graph

`DisplayBBStatistic` Holds a either `on` or `off` to enable/disable basic block statistics

`BBStatistic` Holds the mode for the basic block statistics. This can either be `off`, `normal` or `advanced`

`AnalysisScript` Holds the relative path to the analysis script, e.g., `xmc4500.osx` starting from the `analysis` folder

`CFGOutput` Specifies the output format or disables the control flow graph generation. The values can be either be `dot(interactive)`, `dot`, `png` or `off`