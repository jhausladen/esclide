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
Variance.hex \

SECONDARY_LIST += \
Variance.lst \

SECONDARY_SIZE += \
Variance.siz \


# All Target
all: Variance.elf secondary-outputs

# Tool invocations
Variance.elf: $(OBJS) ../Variance.ld $(USER_OBJS)
	@echo 'Building target: $@'
	@echo 'Invoking: ARM-GCC C Linker'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-gcc" -T"../Variance.ld" -nostartfiles -L"C:\DAVE-3.1\eclipse\/../CMSIS/Infineon/Lib" -L"C:\DAVE-3.1\eclipse\/../Examples/Lib" -L"C:\DAVE-3.1\eclipse\/../emWin/Start/GUI" -L"C:\DAVE-3.1\eclipse\/../CMSIS/Lib/GCC" -Wl,-Map,"Variance.map" -mcpu=cortex-m0 -mthumb -g3 -gdwarf-2 -o "Variance.elf" "@makefile.rsp" $(USER_OBJS) $(LIBS)
	@echo 'Finished building target: $@'
	@echo ' '

Variance.hex: Variance.elf
	@echo 'Invoking: ARM-GCC Create Flash Image'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objcopy" -O ihex "Variance.elf"  "Variance.hex"
	@echo 'Finished building: $@'
	@echo ' '

Variance.lst: Variance.elf
	@echo 'Invoking: ARM-GCC Create Listing'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-objdump" -h -S "Variance.elf" > "Variance.lst"
	@echo 'Finished building: $@'
	@echo ' '

Variance.siz: Variance.elf
	@echo 'Invoking: ARM-GCC Print Size'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-size"  --format=berkeley Variance.elf
	@echo 'Finished building: $@'
	@echo ' '

# Other Targets
clean:
	-$(RM) $(SECONDARY_SIZE)$(OBJS)$(C_DEPS)$(SECONDARY_FLASH)$(S_DEPS)$(ARM_GCC_FOR_XMC_LINKER_OUTPUT_TYPE_OUTPUTS)$(SECONDARY_LIST) Variance.elf
	-@echo ' '

secondary-outputs: $(SECONDARY_FLASH) $(SECONDARY_LIST) $(SECONDARY_SIZE)

.PHONY: all clean dependents
.SECONDARY:

-include ../makefile.targets
