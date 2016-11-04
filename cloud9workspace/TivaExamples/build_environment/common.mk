# Makefile for tivaboards
# The emmitted commands roughly resemble the ones by CCS

TIVAWARE_PATH = ../build_environment/tivaware
XGCC_PREFIX     = arm-none-eabi-
MCU           = TM4C1294NCPDT
TARGET        = TM4C129_RA1
OPENOCD_CFG   = ek-tm4c1294xl.cfg

# optional path to openocd repository checkout
# OPENOCD_DEV_PATH = ~/work/openocd/git

##########################
# End of intended config #
##########################

SHELL = /bin/sh
# disable built-in variables

OUTDIR  := bin
OBJECTS = $(addprefix $(OUTDIR)/,$(notdir $(SOURCES:.c=.o)))

CC      = $(XGCC_PREFIX)gcc
# let gcc call the linker because this enables us to use libc functions (e.g. snprintf)
LD      = $(XGCC_PREFIX)gcc
AR      = $(XGCC_PREFIX)ar
OBJCOPY = $(XGCC_PREFIX)objcopy
RM      = rm -rf
MKDIR   = mkdir -p
OPENOCD = openocd

# Do not remove intermediate object files
# .PRECIOUS: $(OUTDIR)/%.o

# We *need* to supply these to the compiler *and* linker
ARCHFLAGS += -mcpu=cortex-m4 -march=armv7e-m -mthumb -mfloat-abi=softfp -mfpu=fpv4-sp-d16

CFLAGS += -I$(TIVAWARE_PATH)
CFLAGS += -ffunction-sections -fdata-sections
CFLAGS += -g -gdwarf-3 -gstrict-dwarf
CFLAGS += -Wall
CFLAGS += -MD
CFLAGS += -std=c99 -pedantic
CFLAGS += -Wextra -Wno-unused-parameter
CFLAGS += -MMD -MP
CFLAGS += -O0

CPPFLAGS += -DPART_$(MCU)
CPPFLAGS += -DTARGET_IS_$(TARGET) 

LD_SCRIPT = $(BUILDENV)/gcc/$(shell echo $(MCU) | tr '[:upper:]' '[:lower:]').lds

LDFLAGS += -T $(LD_SCRIPT) -Wl,--entry -Wl,ResetISR -Wl,--gc-sections
# override built-in specs, needed for successful linking with libc
LDFLAGS += --specs=rdimon.specs
LDFLAGS += -lrdimon -lc -lgcc
LDFLAGS += -Wl,-L$(TIVAWARE_PATH)/driverlib/gcc/ -Wl,-ldriver
# LDFLAGS += -Wl,-M -Wl,-Map=$(OUTNAME).map

ARFLAGS := -rcs

# -include $(OBJECTS:.o=.d)
-include $(addprefix $(OUTDIR)/,$(SOURCES:.c=.d))

all: $(OUTDIR)/$(OUTNAME)$(OUTSUFFIX)

$(OUTDIR)/%.o: %.c | $(OUTDIR)
	$(CC) -c $(ARCHFLAGS) $(CPPFLAGS) $(CFLAGS) $< -o $@

$(OUTDIR)/%.elf: $(OBJECTS)
	$(LD) $(ARCHFLAGS) -o $@ $^ $(LDFLAGS)

$(OUTDIR)/%$(OUTSUFFIX): $(OUTDIR)/%.elf
	$(OBJCOPY) -O binary $< $@

$(OUTDIR)/%.a: $(OBJECTS) | $(OUTDIR)
	$(AR) $(ARFLAGS) $@ $^

$(OUTDIR):
	$(MKDIR) -p $(OUTDIR)

download: $(OUTDIR)/$(OUTNAME)$(OUTSUFFIX)
ifdef OPENOCD_DEV_PATH
	$(OPENOCD_DEV_PATH)/src/openocd --search $(OPENOCD_DEV_PATH)/tcl -f board/$(OPENOCD_CFG) -c "program $< verify reset exit"
else
	$(OPENOCD) -f board/$(OPENOCD_CFG) -c "program $< verify reset exit"
endif

clean:
	-$(RM) $(OUTDIR)

.SUFFIXES:
.SUFFIXES: .c .o .a .d .h

# Do not remove .elf files even if they are intermediates
.SECONDARY: $(OUTDIR)/$(OUTNAME).elf

.DEFAULT_GOAL := all
.PHONY: all clean download
