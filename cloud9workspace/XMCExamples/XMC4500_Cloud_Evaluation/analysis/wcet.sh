#!/bin/bash
bin="../bin/firmware.elf"
flowfacts="flowfacts.ffx"
script="/usr/local/share/Otawa/scripts/xmc4500.osx"
functions="bubblesort mean GetADCValues processData main"


for word in $functions
do
	owcet2 $bin -s $script -f $flowfacts $word
done
