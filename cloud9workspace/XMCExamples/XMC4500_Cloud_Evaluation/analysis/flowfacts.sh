#!/bin/bash
bin="../bin/firmware.elf"
flowfacts="flowfacts.ffx"
functions="bubblesort mean main ADC_Read_Blocking GetADCValues"
sources="../src/main.c -s ../src/adc.c"
includes="sys -I ../inc"

#mkffx $bin -s $sources -I $includes -f $flowfacts -r $functions
mkffx $bin -f $flowfacts -r $functions
