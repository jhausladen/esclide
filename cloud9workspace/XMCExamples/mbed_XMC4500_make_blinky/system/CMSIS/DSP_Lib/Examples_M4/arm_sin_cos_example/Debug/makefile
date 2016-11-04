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
Sine.hex \

SECONDARY_LIST += \
Sine.lst \

SECONDARY_SIZE += \
Sine.siz \


# All Target
all: Sine.elf secondary-outputs

# Tool invocations
Sine.elf: $(OBJS) ../Sine.ld $(USER_OBJS)
	@echo 'Building target: $@'
	@echo 'Invoking: ARM-GCC C Linker'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-gcc" -T"../Sine.ld" -nostartfiles -L"C:\DAVE-3.1\eclipse\/../Examples/Lib" -L"C:\DAVE-3.1\eclipse\/../CMSIS/Lib/GCC" -Wl,-Map,"Sine.map" -mcpu=cortex-m4 -mthumb -g3 -gdwarf-2 -o "Sine.elf" "@makefile.rsp" $(USER_OBJS) $(LIBS)
	@echo 'Finished building target: $@'
	@echo ' '

Sine.hex: Sine.elf
	@echo 'Invoking: ARM-GCC Create Flash Image'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objcopy" -O ihex "Sine.elf"  "Sine.hex"
	@echo 'Finished building: $@'
	@echo ' '

Sine.lst: Sine.elf
	@echo 'Invoking: ARM-GCC Create Listing'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objdump" -h -S "Sine.elf" > "Sine.lst"
	@echo 'Finished building: $@'
	@echo ' '

Sine.siz: Sine.elf
	@echo 'Invoking: ARM-GCC Print Size'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-size"  --format=berkeley Sine.elf
	@echo 'Finished building: $@'
	@echo ' '

# Other Targets
clean:
	-$(RM) $(SECONDARY_SIZE)$(OBJS)$(C_DEPS)$(SECONDARY_FLASH)$(S_DEPS)$(ARM_GCC_FOR_XMC_LINKER_OUTPUT_TYPE_OUTPUTS)$(SECONDARY_LIST) Sine.elf
	-@echo ' '

secondary-outputs: $(SECONDARY_FLASH) $(SECONDARY_LIST) $(SECONDARY_SIZE)

.PHONY: all clean dependents
.SECONDARY:

-include ../makefile.targets
