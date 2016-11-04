################################################################################
# Automatically-generated file. Do not edit!
################################################################################

-include ../makefile.init

RM := rm -rf

# All of the sources participating in the build are defined here
-include sources.mk
-include Startup/subdir.mk
-include Common/Source/subdir.mk
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
Signal_converge.hex \

SECONDARY_LIST += \
Signal_converge.lst \

SECONDARY_SIZE += \
Signal_converge.siz \


# All Target
all: Signal_converge.elf secondary-outputs

# Tool invocations
Signal_converge.elf: $(OBJS) ../Signal_converge.ld $(USER_OBJS)
	@echo 'Building target: $@'
	@echo 'Invoking: ARM-GCC C Linker'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-gcc" -T"../Signal_converge.ld" -nostartfiles -L"C:\DAVE-3.1\eclipse\/../CMSIS/Infineon/Lib" -L"C:\DAVE-3.1\eclipse\/../CMSIS/Lib/GCC" -L"C:\DAVE-3.1\eclipse\/../Examples/Lib" -L"C:\DAVE-3.1\eclipse\/../emWin/Start/GUI" -Wl,-Map,"Signal_converge.map" -mcpu=cortex-m4 -mthumb -g3 -gdwarf-2 -o "Signal_converge.elf" "@makefile.rsp" $(USER_OBJS) $(LIBS)
	@echo 'Finished building target: $@'
	@echo ' '

Signal_converge.hex: Signal_converge.elf
	@echo 'Invoking: ARM-GCC Create Flash Image'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objcopy" -O ihex "Signal_converge.elf"  "Signal_converge.hex"
	@echo 'Finished building: $@'
	@echo ' '

Signal_converge.lst: Signal_converge.elf
	@echo 'Invoking: ARM-GCC Create Listing'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objdump" -h -S "Signal_converge.elf" > "Signal_converge.lst"
	@echo 'Finished building: $@'
	@echo ' '

Signal_converge.siz: Signal_converge.elf
	@echo 'Invoking: ARM-GCC Print Size'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-size"  --format=berkeley Signal_converge.elf
	@echo 'Finished building: $@'
	@echo ' '

# Other Targets
clean:
	-$(RM) $(SECONDARY_SIZE)$(OBJS)$(C_DEPS)$(SECONDARY_FLASH)$(S_DEPS)$(ARM_GCC_FOR_XMC_LINKER_OUTPUT_TYPE_OUTPUTS)$(SECONDARY_LIST) Signal_converge.elf
	-@echo ' '

secondary-outputs: $(SECONDARY_FLASH) $(SECONDARY_LIST) $(SECONDARY_SIZE)

.PHONY: all clean dependents
.SECONDARY:

-include ../makefile.targets
