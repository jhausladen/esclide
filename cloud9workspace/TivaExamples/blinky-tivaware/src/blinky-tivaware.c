#include <stdint.h>
#include <stdbool.h>
#include "inc/tm4c1294ncpdt.h"
#include "inc/hw_memmap.h"
#include "driverlib/gpio.h"
#include "driverlib/sysctl.h"

// A very simple example that blinks one of the on-board LEDs using the higher-level
// library provided by Texas Instruments named Tivaware.
// The respective commands used in pure register access configuration are commented
// above the library function calls.

int main(void) {
    // volatile uint32_t ui32Loop;

    //
    // Enable the GPIO port that is used for the LED.
    //
    // SYSCTL_RCGCGPIO_R = SYSCTL_RCGCGPIO_R12;
    SysCtlPeripheralEnable(SYSCTL_PERIPH_GPION);

    //
    // Do a dummy read to insert a few cycles after enabling the peripheral.
    //
    // ui32Loop = SYSCTL_RCGCGPIO_R;
    SysCtlDelay(1);

    //
    // Enable the GPIO pin for the LED (D2).  Set the direction as output, and
    // enable the GPIO pin for digital function.
    //
    // GPIO_PORTN_DIR_R = 0x01;
    // GPIO_PORTN_DEN_R = 0x01;
    GPIOPinTypeGPIOOutput(GPIO_PORTN_BASE, GPIO_PIN_0);
    GPIOPadConfigSet(GPIO_PORTN_BASE, GPIO_PIN_0, GPIO_STRENGTH_2MA, GPIO_PIN_TYPE_STD);

    //
    // Loop forever.
    //
    while(1) {
        //
        // Turn on the LED.
        //
        // GPIO_PORTN_DATA_R |= 0x01;
        GPIOPinWrite(GPIO_PORTN_BASE, GPIO_PIN_0, GPIO_PIN_0);

        //
        // Delay for a bit.
        //
        // for(ui32Loop = 0; ui32Loop < 200000; ui32Loop++) {
        // }
        SysCtlDelay(200 * (120 * 1000 * 1000 / (3000 * 10)));

        //
        // Turn off the LED.
        //
        // GPIO_PORTN_DATA_R &= ~(0x01);
        GPIOPinWrite(GPIO_PORTN_BASE, GPIO_PIN_0, ~GPIO_PIN_0);


        //
        // Delay for a bit.
        //
        // for(ui32Loop = 0; ui32Loop < 200000; ui32Loop++) {
        // }
        SysCtlDelay(200 * (120 * 1000 * 1000 / (3000 * 10)));
    }
}
