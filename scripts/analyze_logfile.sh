#!/bin/bash

# This script is used to analyze log files either at runtime within the cloud container 
# or locally later on specifying, a specific logfile or a folder with multiple logfiles.
# author:    Jürgen Hausladen
# copyright: 2017, SAT, UAS Technikum Wien
# License:   AGPL <http://www.gnu.org/licenses/agpl.txt>

# Function to print information on script usage
usage() { echo "Usage: $0 [-n <last-X-entries> -d <last-X-days> -c <container> -s <select-container-from-configurationfile> -f <container-logfile> -l <local-logfile> -o <legacy-logfile-support>"] 1>&2; exit 1; }

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
  if [ "$CONTAINERLIST" == "" ] ; then
    echo "Error (-s): File does not exist or is invalid!" 1>&2;
    exit 1;
  fi
}

# Function to analyze filtered logfiles, in order to print 
# user-related access information only for a specified timeframe
analyzeDateInformation() {
  printf '%s\n' "$1" | while IFS= read -r line
  do
    tmpdate=$(echo $line | sed -r 's/\-[0-9]+:.*//')
    tmptime=$(echo $line | sed -r 's/[0-9]+\-[0-9]+\-[0-9]+\-//' | sed -r 's/\:\s.*//' | sed -r 's/\s.*//')
    timestamp=$tmpdate" "$tmptime  
    dateinseconds=$(date +%s -d "$timestamp")
    if (( $dateinseconds > $2 )) ; then
      echo " $(echo $line)"
    fi
  done
}

# Check number of arguments
#if [ $# == 0 ] ; then usage ; exit 1 ; fi

FILEPATH="/var/log/supervisor/cloud9.log"
LOCALLOGFILEPATH=""
CONTAINER=""
CONTAINERLIST=""
LOGPATTERN="tty.*[0-9]+\-[0-9]+\-[0-9]+\-[0-9]+:[0-9]+:[0-9]+.*Client"
NUMBEROFENTRIES=-2
NUMBEROFDAYSINSECONDS=0
FILTEREDLOGFILE=""


# Iterate over commandline arguments
while getopts ':n:d:c:s:f:l:oh' OPTION ; do
  case "$OPTION" in
    n)   if [[ $OPTARG =~ ^[0-9]+$ ]] ; then NUMBEROFENTRIES=$(($OPTARG*-1)); else echo "Error (-n): Not a number!" 1>&2; exit 1;fi;;
    d)   if [[ $OPTARG =~ ^[0-9]+$ ]] ; then NUMBEROFDAYSINSECONDS=$(($(date +%s)-$(($OPTARG*86400)))); else echo "Error (-d): Not a number!" 1>&2; exit 1;fi;;
    c)   CONTAINER=$OPTARG;;
    s)   readConfigFile $OPTARG;;
    f)   FILEPATH=$OPTARG;;
    l)   LOCALLOGFILEPATH=$OPTARG;;
    o)   LOGPATTERN="User.*!";;
    h)   usage ;;
    *)   echo "Unknown parameter -$OPTARG !" && usage 
  esac
done

# Iterate through all containers, output and analyze the logfile
if [ "$CONTAINER" == "" ] && [ "$CONTAINERLIST" == "" ] && [ "$LOCALLOGFILEPATH" == "" ] ; then
  for container in $(docker ps --format '{{.Names}}'); do
    echo "Processing: $container"
    FILTEREDLOGFILE=$(docker exec $container grep -P $LOGPATTERN $FILEPATH | sed -r 's/.*\]//' | tail $NUMBEROFENTRIES)
    if [ $NUMBEROFDAYSINSECONDS == 0 ] ; then
      echo "$FILTEREDLOGFILE"
    else
      analyzeDateInformation "$FILTEREDLOGFILE" $NUMBEROFDAYSINSECONDS;
    fi
  done
else
  #  Analyze the logfile of a aspecific container
  if [ "$CONTAINER" != "" ] ; then
    echo "Processing: $CONTAINER"
    FILTEREDLOGFILE=$(docker exec $CONTAINER grep -P $LOGPATTERN $FILEPATH | sed -r 's/.*\]//' | tail $NUMBEROFENTRIES)
    if [ $NUMBEROFDAYSINSECONDS == 0 ] ; then
      echo "$FILTEREDLOGFILE"
    else
      analyzeDateInformation "$FILTEREDLOGFILE" $NUMBEROFDAYSINSECONDS;
    fi
  # Analyze the logfile of all containers specified in the cloud configuration file
  elif [ "$CONTAINERLIST" != "" ] ; then
    for container in $CONTAINERLIST ; do
      echo "Processing: $container"
      FILTEREDLOGFILE=$(docker exec $container grep -P $LOGPATTERN $FILEPATH | sed -r 's/.*\]//' | tail $NUMBEROFENTRIES)
      if [ $NUMBEROFDAYSINSECONDS == 0 ] ; then
        echo "$FILTEREDLOGFILE"
      else
        analyzeDateInformation "$FILTEREDLOGFILE" $NUMBEROFDAYSINSECONDS;
      fi
    done
  # Analyze locally stored logfiles
  else
    # Check if the path to the logfile is a folder
    if [[ -d $LOCALLOGFILEPATH ]] ; then
      for configfile in *.log; do
        echo "Processing: $configfile"
        FILTEREDLOGFILE=$(grep $LOGPATTERN $configfile | sed -r 's/.*\]//' | tail $NUMBEROFENTRIES)
        if [ $NUMBEROFDAYSINSECONDS == 0 ] ; then
          echo "$FILTEREDLOGFILE"
        else
          analyzeDateInformation "$FILTEREDLOGFILE" $NUMBEROFDAYSINSECONDS;
        fi
      done
    # Check if the path to the logfile is a file
    elif [[ -f $LOCALLOGFILEPATH ]] ; then
      echo "Processing: $LOCALLOGFILEPATH"
      FILTEREDLOGFILE=$(grep $LOGPATTERN $LOCALLOGFILEPATH | sed -r 's/.*\]//' | tail $NUMBEROFENTRIES)
      if [ $NUMBEROFDAYSINSECONDS == 0 ] ; then
        echo "$FILTEREDLOGFILE"
      else
        analyzeDateInformation "$FILTEREDLOGFILE" $NUMBEROFDAYSINSECONDS;
      fi
    else
      echo "$LOCALLOGFILEPATH is not valid!"
      exit 1
    fi
  fi
fi