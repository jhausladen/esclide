#!/bin/bash

file="/.secret"
pw=$(head -n 1 "$file")
cmdlinearguments=""
if [[ $pw != "" ]]; then
    if [[ $@ != *"--password"* ]]; then
        nextispassword=0
        for var in "$@"
        do
            if [[ $var == *"--username"* ]]; then
                cmdlinearguments="$cmdlinearguments $var"
                nextispassword=1
            else
                if [[ $nextispassword == 1 ]]; then
                    pw=$(echo $pw | openssl enc -aes-256-cbc -a -d -salt -pass pass:$var)
                    cmdlinearguments="$cmdlinearguments $var --password $pw"
                    nextispassword=0
                else
                    cmdlinearguments="$cmdlinearguments $var"
                fi
            fi
        done
    fi
else
    cmdlinearguments="$@"
fi

ME=`readlink "$0" || echo "$0"`
cd `dirname "$ME"`/..

make worker

case `uname -a` in
Linux*x86_64*)  echo "Linux 64 bit"
    eval node server.js "$cmdlinearguments" -a x-www-browser
    ;;

Linux*i686*)  echo "Linux 32 bit"
    eval node server.js "$cmdlinearguments" -a x-www-browser
    ;;

Linux*arm*)  echo "Linux ARM"
    eval node server.js "$cmdlinearguments" -a x-www-browser
    ;;

Darwin*)  echo  "OSX"
    eval node server.js "$cmdlinearguments" -a open
    ;;

FreeBSD*64*) echo "FreeBSD 64 bit"
    eval node server.js "$cmdlinearguments" -a open
    ;;

CYGWIN*)  echo  "Cygwin"
    eval node server.js "$cmdlinearguments" -a "cmd /c start"
    ;;

MING*)  echo  "MingW"
    eval node server.js "$cmdlinearguments" -a "cmd /c start"
    ;;

SunOS*)  echo  "Solaris"
    eval node server.js "$cmdlinearguments"
    ;;


*) echo "Unknown OS"
   ;;
esac
