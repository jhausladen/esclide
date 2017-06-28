# Maintenance scripts

This part of the repository hosts scripts that can be used to manage cloud IDE instances and ease configuration.

## Requirements

  * python and/or bash

## Backup & Restore

    python backup_container.py <container> <destination folder> 
    python restore_container.py <container> <source folder>

## Convert Let's Encrypt certificate to JKS

Modify the "Configuration options" section to your to fit your environment and run:

    ./convert_letsencrypt_jks.sh

## Manually run cloud IDE outside the docker container

    ./start-cloud9.sh

## Update files/folders within one, a group or all containers to, e.g., apply upgrades  

    ./update_container_content.sh -f <file/folder> -p <path-in-container> [-r <delete-path-in-container> -c <container> -s <select-container-from-configurationfile> -w <change-to-workspace>]

## Generate configuration files for an autonomous setup procedure

    python generate_configuration.py -p <Portrange> -l <List of Users> {-b <XMC4500/TM4C1294XL> or -u (Universal Setup)} [-o <Outputfile> -w <Copy Path to Workspace>]

The list of the users has to be in the form of a simple text file, where, e.g., the last name of each student is separated by a line break.

## Analyze logfiles in regard of user activity

    ./analyze_logfile.sh [-n <last-X-entries> -d <last-X-days> -c <container> -s <select-container-from-configurationfile> -f <container-logfile> -l <local-logfile> -o <legacy-logfile-support>]

If no option is specified, the script iterates over all running containers on a system and tries to analyze the cloud IDE logfile. Otherwise one can select 
a specific container, or a list of containers based on a cloud configuration file. Optionally one can also specify the number of entries that shall be listed, the number of days to search in the history and adjust the path where the logfile is located. Moreover the specification of a local file/folder containing exported cloud IDE logs is possible. The legacy mode is only required for old log files, where the logging logic was implemented on the client side.