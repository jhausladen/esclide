/*
 * adc.c
 *
 *  Created on: 17.10.2013
 *      Author: Thomas Jerabek
 */

#include <XMC4500.h>   
#include <stdio.h>
#include <stdint.h>

#define ADC_VALUE_MAX      (0xFFFF)

uint8_t ADC_FLAG = 0;
uint32_t ADC_Clk = 200000;	// 150kHz
uint32_t ADC_VALUE;


void ADC_Init(void)
{
  SCU_RESET->PRCLR0 |= ( 1 <<  0) ;          /* De-assert VADC Reset          */

  VADC->CLC       =   0;                     /* enable the VADC module clock  */
  VADC->GLOBCFG   = ((1UL << 15) |           /* enable DIVA write control     */
                     (6UL <<  0)  );         /* set DIVA to 6                 */
  /* Arbitration */		
  VADC_G0->ARBCFG = ((3UL << 16) |           /* ANONS normal operation        */ 
                     (3UL <<  0)  );         /* ANONC normal operation        */
  VADC_G0->ARBPR  = ((1UL << 26) |           /* enable arbitration slot 02    */
                     (1UL <<  8)  );         /* priority set to 1             */
		
  /* BACKGROUND SOURCE */
  VADC->BRSSEL[0] =  (1UL << 1);             /* enable input chn 1 group 0 - P14.1 */
  VADC->BRSCTRL   = ((1UL << 23) |           /* enable write control GTMODE,. */
                     (1UL << 15)  );         /* enable write control XTMODE,. */

  VADC->BRSMR     = ((1UL <<  0)  );         /* ENGT = 01B                    */

  VADC->BRSMR    |= (1UL <<  3);             /* enable source interrupt       */

  NVIC_EnableIRQ(VADC0_C0_0_IRQn);           /* enable ADC Interrupt          */
}

/* start analog digital conversion */
void ADC_Start(void)
{
	VADC->BRSMR |= (1UL <<  9);   /* generate Load event  */  
}


void ADC_Stop(void)
{
	// stub: stop adc in continuous mode
}


/* ADC read value function */
uint16_t ADC_Read(void)
{
	uint16_t adcVal = 0;

	adcVal = VADC_G0->RES[0] & ADC_VALUE_MAX; /* Store converted value */
	
	return adcVal;
}

/* ADC read value function which waits until the analog digital conversion is done */
uint16_t ADC_Read_Blocking(void)
{
    uint8_t i = 1;

    while(ADC_FLAG == 0)
    {
        if(i == 0)
        {
            break;
        }
    }
    return (uint16_t)(VADC_G0->RES[0] & ADC_VALUE_MAX);
}

/* ADC Interrupt service routine - only set the ADC FLAG to indicate available data */
void VADC0_C0_0_IRQHandler(void) 
{
	ADC_FLAG = 1;
	//ADC_VALUE = VADC_G0->RES[0] & ADC_VALUE_MAX; /* Store converted value */
}
