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
