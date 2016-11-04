#include <stdint.h>
#include <stdbool.h>
#include "inc/tm4c1294ncpdt.h"
#include "driverlib/gpio.h"
#include "driverlib/pin_map.h"
#include "inc/hw_memmap.h"
#include "driverlib/sysctl.h"
#include "driverlib/interrupt.h"

enum DIR {DOWN = 0, UP = 1};
//static volatile bool dir = UP;
static volatile int8_t mah = 1;
static volatile int dir = 1;

static const unsigned int LED_CNT = 4;

void set_led(uint8_t bit_num, bool val) {
    switch(bit_num) {
    case 0:
        GPIOPinWrite(GPIO_PORTN_BASE, GPIO_PIN_1, val ? GPIO_PIN_1 : 0);
        break;
    case 1:
        GPIOPinWrite(GPIO_PORTN_BASE, GPIO_PIN_0, val ? GPIO_PIN_0 : 0);
        break;
    case 2:
        GPIOPinWrite(GPIO_PORTF_BASE, GPIO_PIN_4, val ? GPIO_PIN_4 : 0);
        break;
    case 3:
        GPIOPinWrite(GPIO_PORTF_BASE, GPIO_PIN_0,  val ? GPIO_PIN_0 : 0);
        break;
    }
}

void set_leds(uint8_t mask) {
    for (unsigned int i = 0; i < LED_CNT; i++) {
        set_led(i, mask & (1 << i));
    }
}

void int_btn_usr1(void) {
    // Very first: clear the interrupt
    GPIOIntClear(GPIO_PORTJ_BASE, GPIO_PIN_0);
    dir = !dir;
}

/*
 * main.c
 */


int main(void)
{
    // LEDs:
    // D1   PN1
    // D2   PN0
    // D3   PF4
    // D4   PF0

    // BTNs:
    // USR1 PJ0
    // USR2 PJ1

    // Enable the GPIO ports that are used for the on-board LED and the Key.
    SysCtlPeripheralEnable(SYSCTL_PERIPH_GPIOJ);
    SysCtlPeripheralEnable(SYSCTL_PERIPH_GPION);
    SysCtlPeripheralEnable(SYSCTL_PERIPH_GPIOF);

    // Set push button pin to input + pullup
    GPIOPadConfigSet(GPIO_PORTJ_BASE, GPIO_PIN_0, GPIO_STRENGTH_2MA, GPIO_PIN_TYPE_STD_WPU);

    // Set up interrupt for USR BTN 1
    GPIOIntRegister(GPIO_PORTJ_BASE, int_btn_usr1);
    GPIOIntTypeSet(GPIO_PORTJ_BASE, GPIO_PIN_0, GPIO_FALLING_EDGE);
    GPIOIntEnable(GPIO_PORTJ_BASE, GPIO_INT_PIN_0);

    // Enable the GPIO pins for the LEDs.
    // Set the direction as output, and enable the GPIO pin for digital function.
    GPIOPinTypeGPIOOutput(GPIO_PORTF_BASE, GPIO_PIN_4 | GPIO_PIN_0);
    GPIOPadConfigSet(GPIO_PORTF_BASE, GPIO_PIN_4 | GPIO_PIN_0, GPIO_STRENGTH_2MA, GPIO_PIN_TYPE_STD);
    GPIOPinTypeGPIOOutput(GPIO_PORTN_BASE, GPIO_PIN_1 | GPIO_PIN_0);
    GPIOPadConfigSet(GPIO_PORTN_BASE, GPIO_PIN_1 | GPIO_PIN_0, GPIO_STRENGTH_2MA, GPIO_PIN_TYPE_STD);

    // start with LED 1 set
    set_leds(0x01);

    uint8_t var = 1;
   int ui32Loop = 0;
    while (1) {
        SysCtlDelay(5000000);


        if (dir) {
            var <<= 1;
            if (var >= (1 << LED_CNT))
                var = 1;
        } else {
            var >>= 1;
            if (var == 0)
                var = (1 << (LED_CNT - 1));
        }
        set_leds(var);
        ui32Loop++;
    }
}
