################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../arm_dotproduct_example_f32.c 

OBJS += \
./arm_dotproduct_example_f32.o 

C_DEPS += \
./arm_dotproduct_example_f32.d 


# Each subdirectory must supply rules for building sources it contributes
%.o: ../%.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM-GCC C Compiler'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-gcc" -DUC_ID=1301027 -DARM_MATH_CM0 -I"C:\DAVE-3.1\eclipse\/../CMSIS/Include" -I"C:\DAVE-3.1\eclipse\/../CMSIS/Infineon/Include" -I"C:\DAVE-3.1\ARM-GCC/arm-none-eabi/include" -I"C:\DAVE-3.1\eclipse\/../emWin/Start/GUI/inc" -I"C:\DAVE-3.1\eclipse\/../CMSIS/Infineon/XMC1300_series/Include" -O0 -ffunction-sections -Wall -std=gnu99 -mfloat-abi=soft -Wa,-adhlns="$@.lst" -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d) $@" -mcpu=cortex-m0 -mthumb -g3 -gdwarf-2 -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


