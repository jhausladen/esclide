#!/bin/bash

# This script is used to update files/folders in running cloud IDE containers
# author:    Jürgen Hausladen
# copyright: 2017, SAT, UAS Technikum Wien
# License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

# Function to print information on script usage
usage() { echo "Usage: $0 -f <file/folder> -p <path-in-container> [-r <delete-path-in-container> -c <container> -s <select-container-from-configurationfile> -w <change-to-workspace>] " 1>&2; exit 1; }

# Function to read a cloud configuration file and parse the name of each docker container
readConfigFile() {
  while IFS= read -r line
    do
      if [[ "$line" == "name ="* ]] ; then
        container_name="${line/name = /}"
        if [ "$CONTAINERLIST" == "" ] ; then CONTAINERLIST=$container_name
        else CONTAINERLIST="$CONTAINERLIST $container_name"
        fi
      fi
  done <"$1"
}

# Check number of arguments
if [ $# == 0 ] ; then usage ; exit 1 ; fi

FILEPATH=""
CONTAINERPATH=""
PATHTODELETE=""
CONTAINER=""
CONTAINERLIST=""
CHANGETOWORKSPACE=0

# Iterate over commandline arguments
while getopts ':f:p:c:s:wr:h' OPTION ; do
  case "$OPTION" in
    f)   FILEPATH=$OPTARG;;
    p)   CONTAINERPATH=$OPTARG;;
    c)   CONTAINER=$OPTARG;;
    s)   readConfigFile $OPTARG ;;
    w)   CHANGETOWORKSPACE=1;;
    r)   PATHTODELETE=$OPTARG;;
    h)   usage ;;
    *)   echo "Unknown parameter -$OPTARG !" && usage 
  esac
done

# Check if file/folder path as well as the path to place within the container is specified
if [ "$FILEPATH" == "" ] || [ "$CONTAINERPATH" == "" ] ; then usage ; exit 1 ; fi

# Iterate through all containers, optionally remove a specified directory and copy over the file/folder
if [ "$CONTAINER" == "" ] && [ "$CONTAINERLIST" == "" ] ; then
  for container in $(docker ps -a -q); do
    echo "Processing: $container"
    if [ "$PATHTODELETE" != "" ] ; then docker exec $container rm -rf $PATHTODELETE ; fi
    if [ $CHANGETOWORKSPACE == 1 ] ; then 
      docker cp $FILEPATH $container:"/"$container"/"$CONTAINERPATH
    else  
      docker cp $FILEPATH $container:$CONTAINERPATH
    fi
  done
else
  #  Copy a file/folder to a aspecific container and optionally remove a specified directory
  if [ "$CONTAINER" != "" ] ; then
    echo "Processing: $CONTAINER"
    if [ "$PATHTODELETE" != "" ] ; then docker exec $CONTAINER rm -rf $PATHTODELETE ; fi
    if [ $CHANGETOWORKSPACE == 1 ] ; then
      docker cp $FILEPATH $CONTAINER:"/"$CONTAINER"/"$CONTAINERPATH
    else
      docker cp $FILEPATH $CONTAINER:$CONTAINERPATH
    fi
  # Copy a file/folder to a list of containers obtained from a cloud configuration file 
  # and optionally remove a specified directory
  else
    for container in $CONTAINERLIST ; do
      echo "Processing: $container"
      if [ "$PATHTODELETE" != "" ] ; then docker exec $container rm -rf $PATHTODELETE ; fi
      if [ $CHANGETOWORKSPACE == 1 ] ; then
        docker cp $FILEPATH $container:"/"$container"/"$CONTAINERPATH
      else
        docker cp $FILEPATH $container:$CONTAINERPATH
      fi
    done
  fi
fi
