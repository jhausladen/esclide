#!/bin/bash

# This script eases the management of cloud IDE containers
# author:    Jürgen Hausladen
# copyright: 2017, SAT, UAS Technikum Wien
# License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

# Function to print information on script usage
usage() { echo "Usage: $0 -c <container> / -f <select-container-from-configurationfile> [-i <information> -s <start> -p <pause> -r <restart> -d <delete>] " 1>&2; exit 1; }

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

# Function for container management
manageContainer() {
  if [ $INFO == 1 ] && [ "$STATUS" != "" ] ; then
    echo "$STATUS" | grep "$1"
  elif [ $START == 1 ] ; then
    docker start "$1"
  elif [ $PAUSE == 1 ] ; then
    docker stop "$1"
  elif [ $RESTART == 1 ] ; then
    docker restart "$1"
  elif [ $DELETE == 1 ] ; then
    docker stop "$1" ; docker rm -v "$1" ; docker rmi "$1/ubuntu-cloud9-$1" 
  fi
}

# Check number of arguments
if [ $# == 0 ] ; then usage ; exit 1 ; fi

CONTAINER=""
CONTAINERLIST=""
INFO=0
START=0
PAUSE=0
RESTART=0
DELETE=0
STATUS=""

# Iterate over commandline arguments
while getopts ':c:f:isprdh' OPTION ; do
  case "$OPTION" in
    c)   CONTAINER=$OPTARG;;
    f)   readConfigFile $OPTARG ;;
    i)   INFO=1;;
    s)   START=1;;
    p)   PAUSE=1;;
    r)   RESTART=1;;
    d)   DELETE=1;;
    h)   usage ;;
    *)   echo "Unknown parameter -$OPTARG !" && usage 
  esac
done

# Get detailed information on containers 
if [ $INFO == 1 ] ; then
  STATUS=$(docker ps -a)
  echo "$STATUS" | head -1
fi

# Process a single container
if [ "$CONTAINER" != "" ] ; then
  if [ $INFO == 0 ] ; then echo "Processing: $CONTAINER" ; fi
  manageContainer $CONTAINER
# Process multiple containers
elif [ "$CONTAINERLIST" != "" ] ; then
  for container in $CONTAINERLIST ; do
    if [ $INFO == 0 ] ; then echo "Processing: $container" ; fi
    manageContainer $container
  done
else
  usage ; exit 1 ;
fi
