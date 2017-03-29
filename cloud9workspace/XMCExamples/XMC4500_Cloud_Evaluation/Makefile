################################################################################
# USAGE:
# make           .... build the program image
# make debug     .... build the program image and invoke gdb
# make clean     .... remove intermediate and generated files

################################################################################
# define the name of the generated output file
#
TARGET        = firmware

################################################################################
# below only edit with care
#
SRC           = $(wildcard src/*.c)
SRC			 += $(wildcard sys/*.c)
ASRC		  = $(wildcard sys/*.S)
TOOLCHAIN     = arm-none-eabi
UC            = XMC4500
UC_ID         = 4503
CPU           = cortex-m4
GDB_ARGS      = -ex "target remote :2331" -ex "monitor reset" -ex "load" -ex "monitor reset"
LINKER_FILE   = ./sys/XMC4500x1024.ld

AS	 = $(TOOLCHAIN)-as
CC   = $(TOOLCHAIN)-gcc
CP   = $(TOOLCHAIN)-objcopy
OD   = $(TOOLCHAIN)-objdump
GDB  = $(TOOLCHAIN)-gdb
SIZE = $(TOOLCHAIN)-size

AFLAGS= -x assembler-with-cpp
CFLAGS = -mthumb -mcpu=$(CPU)
CFLAGS+= -O0 -ffunction-sections -fdata-sections -mslow-flash-data -Wno-unused-but-set-variable 
CFLAGS+= -MD -std=c99 -Wall -fms-extensions
CFLAGS+= -DUC_ID=$(UC_ID) -DARM_MATH_CM4 -I./src -I./sys -I./inc
CFLAGS+= -g3 -fmessage-length=0
LFLAGS = -nostartfiles -Wl,-Map=bin/$(TARGET).map
CPFLAGS = -Obinary
ODFLAGS = -S

OBJS  = $(SRC:.c=.o)
OBJS += $(ASRC:.S=.o)
#### Rules ####
all: $(OBJS) $(TARGET).elf $(TARGET)

%.o: %.S
	$(CC) $(AFLAGS) -c $(CFLAGS) $< -o $@
	
%.o: %.c
	$(CC) -c $(CFLAGS) $< -o $@

$(TARGET).elf: $(OBJS)
	rm -f bin/*
	mkdir -p bin/
	$(CC) -T $(LINKER_FILE) $(LFLAGS) $(CFLAGS) -o bin/$(TARGET).elf $(OBJS) $(LIBS)

$(TARGET): $(TARGET).elf
	$(CP) $(CPFLAGS) bin/$(TARGET).elf bin/$(TARGET).bin
	$(OD) $(ODFLAGS) bin/$(TARGET).elf > bin/$(TARGET).lst
	$(SIZE) bin/$(TARGET).elf

debug: $(TARGET)
	xterm -e "JLinkGDBServer -Device XMC4500-1024 -if SWD" &
	$(GDB) bin/$(TARGET).elf $(GDB_ARGS)

flash: $(TARGET)
	echo -e 'h\nloadbin bin/$(TARGET).bin,0xC000000\nr\ng\nq' | JLinkExe -Device XMC4500-1024 -if SWD
	
clean:
	rm -rf src/*.o src/*.d bin/* sys/*.o sys/*.d
