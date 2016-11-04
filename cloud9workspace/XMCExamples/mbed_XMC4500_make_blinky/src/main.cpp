#include "mbed.h"
#include "GPIO.h"
#ifdef __cplusplus
extern "C"
{
#endif

#include <stdio.h>
#include "SEGGER_RTT.h"
//#include "infineondave_api.h"
#ifdef __cplusplus
}
#endif

//InfineonDave dave() ;

/*Ticker flipper;
void flip() {
    P1_1_toggle();
}*/


PwmOut led0(PWM0);
PwmOut led1(PWM1);
PwmOut pwm2(PWM2);
PwmOut pwm3(PWM3);

AnalogOut dac0(DAC0);
AnalogOut dac1(DAC1);
int main() {
	
	//Init DAVE apps
	//init_dave();
	
	//XXXXP1_1_set_mode(OUTPUT_PP_GP);
    //XXXXP1_1_set_driver_strength(STRONG);
    
    led0.write(50);
    led1.write(1);
    
    dac0.write(1.75);
    dac1.write_u16(47663);
    int counter = 0;
    //flipper.attach(&flip, 0.5); // setup flipper to call flip after 2 seconds
    //DigitalOut myled(LED1);
    //myled = 1;
    //SysTick_Config(SystemCoreClock/1);
    //SysTick_Config(SystemCoreClock/100);
    //P1_1_toggle();
    //SEGGER_RTT_ConfigUpBuffer(0, NULL, NULL, 0, SEGGER_RTT_MODE_BLOCK_IF_FIFO_FULL);
    //SEGGER_RTT_WriteString(0, "SEGGER Real-Time-Terminal Sample\r\n");
    //SEGGER_RTT_WriteString(0, "###### Testing SEGGER_printf() ######\r\n");
    //SEGGER_RTT_WriteString(0, "Infineon sucks!\r\n");
    //SEGGER_RTT_WriteString(0, "###### SEGGER_printf() Tests done. ######\r\n");
    //flipper.attach(&flip, 1.0); // setup flipper to call flip after 2 seconds
    while(1){

        //SEGGER_RTT_WriteString(0, "Vor wait\r\n");
        led0.pulsewidth_us(10);
        led1.pulsewidth(0.000001);
        //led0.period(0.0001);
        wait(1);
        led0.pulsewidth(0.000001);
        led1.pulsewidth_us(10);
        //led0.period(0.001);
        /*SEGGER_RTT_WriteString(0, "First wait excedded\r\n");*/
        wait(1);
        counter++;
        /*SEGGER_RTT_WriteString(0, "Second wait excedded\r\n");*/
    }
}
