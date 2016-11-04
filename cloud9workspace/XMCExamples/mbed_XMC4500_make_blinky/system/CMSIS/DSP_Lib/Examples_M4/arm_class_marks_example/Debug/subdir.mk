################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../arm_class_marks_example_f32.c 

OBJS += \
./arm_class_marks_example_f32.o 

C_DEPS += \
./arm_class_marks_example_f32.d 


# Each subdirectory must supply rules for building sources it contributes
%.o: ../%.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM-GCC C Compiler'
	"C:\DAVE-3.1\ARM-GCC/bin/arm-none-eabi-gcc" -DARM_MATH_CM4 -DUC_ID=4502 -I"C:\DAVE-3.1\eclipse\/../CMSIS/Include" -I"C:\DAVE-3.1\ARM-GCC/arm-none-eabi/include" -I"C:\DAVE-3.1\eclipse\/../emWin/Start/GUI/inc" -I"C:\DAVE-3.1\eclipse\/../CMSIS/Infineon/XMC4500_series/Include" -O0 -ffunction-sections -Wall -std=gnu99 -mfloat-abi=softfp -Wa,-adhlns="$@.lst" -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d) $@" -mcpu=cortex-m4 -mfpu=fpv4-sp-d16 -mthumb -g3 -gdwarf-2 -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


