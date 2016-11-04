#!/bin/bash
bin="../bin/firmware.elf"
flowfacts="flowfacts.ffx"
functions="bubblesort ADC_Read_Blocking GetADCValues main"
sources="-s ../src/main.c -s ../src/adc.c"
includes="-I sys -I ../inc"

mkffx $bin $sources $includes -f $flowfacts -r $functions
#mkffx $bin -f $flowfacts -r $functions
