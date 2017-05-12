#!/bin/bash

# This script is used to update files/folders in running cloud IDE containers
# author:    Jürgen Hausladen
# copyright: 2017, SAT, UAS Technikum Wien
# License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

# Function to print information on script usage
usage() { echo "Usage: $0 -f <file/folder> -p <path-in-container> [-r <delete-path-in-container>] " 1>&2; exit 1; }

# Check number of arguments
if [ $# == 0 ] ; then usage ; exit 1 ; fi

FILEPATH=""
CONTAINERPATH=""
PATHTODELETE=""

# Iterate over commandline arguments
while getopts ':f:p:r:h' OPTION ; do
  case "$OPTION" in
    f)   FILEPATH=$OPTARG;;
    p)   CONTAINERPATH=$OPTARG;;
    r)   PATHTODELETE=$OPTARG;;
    h)   usage ;;
    *)   echo "Unknown parameter -$OPTARG !" && usage 
  esac
done

# Check if file/folder path as well as the path to place within the container is specified
if [ "$FILEPATH" == "" ] || [ "$CONTAINERPATH" == "" ] ; then usage ; exit 1 ; fi

# Iterate through all containers, optionally renove a specified directory and copy over the file/folder
for container in $(docker ps -a -q); do
  echo "Processing: $container"
  if [ "$PATHTODELETE" != "" ] ; then docker exec $container rm -rf $PATHTODELETE ; fi
  docker cp $FILEPATH $container:$CONTAINERPATH
done

