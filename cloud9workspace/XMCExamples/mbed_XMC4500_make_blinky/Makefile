################################################################################
# USAGE:
# make           .... build the program image
# make debug     .... build the program image and invoke gdb
# make flash     .... build an flash the application
# make doc       .... run doxygen - output will be in > doc
# make clean     .... remove intermediate and generated files

################################################################################
# define the name of the generated output file
#
TARGET        = firmware

################################################################################
# Optional: define the GCC path and the project name
#
GCC_BIN = 

################################################################################
# Optional: Edit project hierarchy 
#
BIN           = ./bin
SYS           = ./system
VENDOR        = Infineon
SRCDIR        = ./src
CMSIS 		  = ./system/CMSIS
MBED 		  = ./system/mbed
RTT 		  = ./system/RTT
#$(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/startup_XMC4500.o $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/system_XMC4500.o $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/retarget.o 
SYS_OBJECTS = $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/retarget.o $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/board.o $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/cmsis_nvic.o $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/startup_XMC4500.o $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/system_XMC4500.o
INCLUDE_PATHS = -I. -I./src -I./system -I$(RTT) -I$(CMSIS)/Include -I$(CMSIS)/Infineon/Lib -I$(MBED) -I$(MBED)/TARGET_XMC4500 -I$(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM -I$(MBED)/TARGET_XMC4500/TARGET_Infineon -I$(MBED)/TARGET_XMC4500/TARGET_Infineon/TARGET_XMC4500 
LIBRARY_PATHS = -L$(CMSIS)/Lib/GCC -L$(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM -L$(CMSIS)/Infineon/Lib
LIBRARIES         = -larm_cortexM4_mathL_2 -lmbed -lxmclibcstubs
LINKER_SCRIPT   = $(MBED)/TARGET_XMC4500/TOOLCHAIN_GCC_ARM/XMC4500.ld
LD_SYS_LIBS = -lstdc++ -lsupc++ -lm -lc -lgcc -lnosys
################################################################################
# below only edit with care
################################################################################
# Setup
#
SRC           = $(wildcard src/*.cpp)
SRCRTT        = $(wildcard system/RTT/*.c)
TOOLCHAIN     = arm-none-eabi
UC            = XMC4500
UC_ID         = 4503
CPU           = cortex-m4
FPU           = fpv4-sp-d16
FABI          = softfp
GDB_ARGS      = -ex "target remote :2331" -ex "monitor SWO EnableTarget 16000000 0 1 0" -ex "monitor reset" -ex "load" -ex "monitor reset"
#Set the Region of the RTT Block manually - Should be fixed in future versions of JLink GDB Server
GDB_ARGS	 += -ex "monitor exec SetRTTAddr 0x20000C20"
#GDB_ARGS	  += -ex "monitor exec SetRTTSearchRanges 0x20000000 0x1000"

AS   = $(GCC_BIN)$(TOOLCHAIN)-as
CC   = $(GCC_BIN)$(TOOLCHAIN)-gcc
CPP  = $(GCC_BIN)$(TOOLCHAIN)-g++
CP   = $(GCC_BIN)$(TOOLCHAIN)-objcopy
OD   = $(GCC_BIN)$(TOOLCHAIN)-objdump
GDB  = $(GCC_BIN)$(TOOLCHAIN)-gdb
SIZE = $(GCC_BIN)$(TOOLCHAIN)-size

CFLAGS = -mthumb -mcpu=$(CPU) -fstack-usage
CFLAGS+= -mfpu=$(FPU) -mfloat-abi=$(FABI)
CFLAGS+= -O0 -ffunction-sections -fdata-sections
CFLAGS+= -MD -Wall -fms-extensions
CFLAGS+= -DUC_ID=$(UC_ID) -DARM_MATH_CM4
CFLAGS+= -g3 -fmessage-length=0 
AFLAGS = -x assembler-with-cpp
LFLAGS = -nostartfiles $(LIBRARY_PATHS) -Wl,--gc-sections --specs=nano.specs -u _printf_float -u _scanf_float -Wl,-Map=$(BIN)/$(TARGET).map
CPFLAGS = -Obinary
ODFLAGS = -S

OBJS = $(SRC:.cpp=.o)
OBJS+= $(SRCRTT:.c=.o)
OBJS+= system/CMSIS/Infineon/Lib/System_LibcStubs.o

#### Rules ####
all: clean $(OBJS) $(TARGET).elf $(TARGET)

mbed:
	python ../mbed/workspace_tools/build.py -m XMC4500 -t GCC_ARM

%.o: %.s
	$(AS) -c $(CFLAGS) -std=c99 $(AFLAGS) $(INCLUDE_PATHS) $< -o $@

%.o: %.c
	$(CC) -c $(CFLAGS) -std=c99 $(INCLUDE_PATHS) $< -o $@
	
%.o: %.cpp
	$(CPP) -c $(CFLAGS) -std=gnu++98 $(INCLUDE_PATHS) $< -o $@

$(TARGET).elf: $(OBJS) $(SYS_OBJECTS)
	mkdir -p $(BIN)
	$(CC) -T $(LINKER_SCRIPT) $(LFLAGS) $(LIBRARY_PATHS) $(CFLAGS) -o $(BIN)/$(TARGET).elf $(OBJS) $(SYS_OBJECTS) $(LIBRARIES) $(LD_SYS_LIBS)

$(TARGET): $(TARGET).elf
	$(CP) $(CPFLAGS) $(BIN)/$(TARGET).elf $(BIN)/$(TARGET).bin
	$(OD) $(ODFLAGS) $(BIN)/$(TARGET).elf > $(BIN)/$(TARGET).lst
	$(SIZE) $(BIN)/$(TARGET).elf

debug: mbed $(TARGET)
	# comment the following line in Windows and launch JLinkGDBServer manually
	xterm -e "JLinkGDBServer -Device XMC4500-1024 -if SWD" &
	$(GDB) -q $(BIN)/$(TARGET).elf $(GDB_ARGS)

flash: mbed $(TARGET)
	echo -e 'h\nloadbin bin/$(TARGET).bin,0xC000000\nr\ng\nq' | JLinkExe -Device XMC4500-1024 -if SWD
	
doc: $(TARGET)
	doxygen
	
clean:
	rm -f $(BIN)/* 
	rm -f $(SRCDIR)/*.o $(SRCDIR)/*.d $(SRCDIR)/*.su  $(SRCDIR)/*~ 
	rm -f $(RTT)/*.o $(RTT)/*.d $(RTT)/*.su  $(RTT)/*~ 
	rm -rf doc/html
	rm -rf ../mbed/build
