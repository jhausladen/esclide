#!/bin/bash
bin="../bin/firmware.elf"
flowfacts="flowfacts.ffx"
script="xmc4500.osx"
functions="bubblesort ADC_Read_Blocking GetADCValues main"


for word in $functions
do
    oswa $bin -s $script -f $flowfacts $word --wcet #--stack --cfg jpg --cfg-path ../bin --cfg-only-prop --bbtimes
	echo "  "
done
