################################################################################
# Automatically-generated file. Do not edit!
################################################################################

-include ../makefile.init

RM := rm -rf

# All of the sources participating in the build are defined here
-include sources.mk
-include Startup/subdir.mk
-include subdir.mk
-include objects.mk

ifneq ($(MAKECMDGOALS),clean)
ifneq ($(strip $(C_DEPS)),)
-include $(C_DEPS)
endif
ifneq ($(strip $(S_DEPS)),)
-include $(S_DEPS)
endif
endif

-include ../makefile.defs

# Add inputs and outputs from these tool invocations to the build variables 
SECONDARY_FLASH += \
FFT.hex \

SECONDARY_LIST += \
FFT.lst \

SECONDARY_SIZE += \
FFT.siz \


# All Target
all: FFT.elf secondary-outputs

# Tool invocations
FFT.elf: $(OBJS) ../FFT.ld $(USER_OBJS)
	@echo 'Building target: $@'
	@echo 'Invoking: ARM-GCC C Linker'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-gcc" -T"../FFT.ld" -nostartfiles -L"C:\DAVE-3.1\eclipse\/../CMSIS/Infineon/Lib" -L"C:\DAVE-3.1\eclipse\/../Examples/Lib" -L"C:\DAVE-3.1\eclipse\/../emWin/Start/GUI" -L"C:\DAVE-3.1\eclipse\/../CMSIS/Lib/GCC" -Wl,-Map,"FFT.map" -mcpu=cortex-m0 -mthumb -g3 -gdwarf-2 -o "FFT.elf" "@makefile.rsp" $(USER_OBJS) $(LIBS)
	@echo 'Finished building target: $@'
	@echo ' '

FFT.hex: FFT.elf
	@echo 'Invoking: ARM-GCC Create Flash Image'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objcopy" -O ihex "FFT.elf"  "FFT.hex"
	@echo 'Finished building: $@'
	@echo ' '

FFT.lst: FFT.elf
	@echo 'Invoking: ARM-GCC Create Listing'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objdump" -h -S "FFT.elf" > "FFT.lst"
	@echo 'Finished building: $@'
	@echo ' '

FFT.siz: FFT.elf
	@echo 'Invoking: ARM-GCC Print Size'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-size"  --format=berkeley FFT.elf
	@echo 'Finished building: $@'
	@echo ' '

# Other Targets
clean:
	-$(RM) $(SECONDARY_SIZE)$(OBJS)$(C_DEPS)$(SECONDARY_FLASH)$(S_DEPS)$(ARM_GCC_FOR_XMC_LINKER_OUTPUT_TYPE_OUTPUTS)$(SECONDARY_LIST) FFT.elf
	-@echo ' '

secondary-outputs: $(SECONDARY_FLASH) $(SECONDARY_LIST) $(SECONDARY_SIZE)

.PHONY: all clean dependents
.SECONDARY:

-include ../makefile.targets
