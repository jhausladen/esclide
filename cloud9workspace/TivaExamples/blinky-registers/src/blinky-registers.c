#include <stdint.h>
#include "inc/tm4c1294ncpdt.h"

// A very simple example that blinks one of the on-board LED using direct register access.

int main(void) {
    volatile uint32_t ui32Loop;

    //
    // Enable the GPIO port that is used for the LED.
    //
    SYSCTL_RCGCGPIO_R = SYSCTL_RCGCGPIO_R12;

    //
    // Do a dummy read to insert a few cycles after enabling the peripheral.
    //
    ui32Loop = SYSCTL_RCGCGPIO_R;

    //
    // Enable the GPIO pin for the LED (D2).  Set the direction as output, and
    // enable the GPIO pin for digital function.
    //
    GPIO_PORTN_DIR_R = 0x01;
    GPIO_PORTN_DEN_R = 0x01;

    //
    // Loop forever.
    //
    while(1) {
        //
        // Turn on the LED.
        //
        GPIO_PORTN_DATA_R |= 0x01;

        //
        // Delay for a bit.
        //
        for(ui32Loop = 0; ui32Loop < 200000; ui32Loop++) {
        }

        //
        // Turn off the LED.
        //
        GPIO_PORTN_DATA_R &= ~(0x01);

        //
        // Delay for a bit.
        //
        for(ui32Loop = 0; ui32Loop < 200000; ui32Loop++) {
        }
    }
}
