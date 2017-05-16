# Generation of configuration files

The most straightforward way of creating configuration files for new cloud IDE instances is to use the python script located in `scripts/generate_configuration.py`. More information can be found in the appropriate [README](../../scripts/README.md).

# Creating configuration files manually

In general config files can include a configuration of one or more cloud instances, which will be set up batchwise. Each cloud instance configration starts with a `[cloudinstance:<Name of the instance>]`, followed by the `docker_container.py` script's options listed in the overall [README](../../README.md).The first part is the written option name separated by a `=` and the value of the  option item (name=\<Name of the instance\>). Each option is separated by a newline character.

# Example setups

When configuring new cloud instances via configuration files one can easily setup the cloud IDE similar to the commandline options, with one of the example configurations shown below:

This configuration creates a cloud IDE instance for debugging local or remote targets.

    [cloudinstance:bleedinguniversal1]
    name = bleedinguniversal1
    workstationname = bleedinguniversal1
    user = sat
    password = ******
    port = 5001
    debugport = 5002


This configuration creates a cloud IDE instance when debugging platforms that are connected directly to the server. In this case, the debug-control service runs directly in the Docker setup.

    [cloudinstance:bleedingti1]
    name = bleedingti1
    workstationname = bleedingti1
    user = username
    password = ******
    port = 5010
    websocket = 5012
    serial = 0F000BC9
    projects = cloud9workspace/LVSetups/workspace_mbe_2016ss
    oocdport = ON
    target = TM4C1294XL

To setup a cloud instance by a configuration file simply run:

    python docker_container.py -c <Setup Configuration>

Further example configurations can be found in the `configs/cloudsetup\_config/haas/` and `configs/cloudsetup\_config/universal/` folder. 