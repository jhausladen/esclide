/*
 * adc.h
 *
 *  Created on: 17.10.2013
 *      Author: Thomas Jerabek
 */

#ifndef ADC_H_
#define ADC_H_

#include <stdint.h>

extern uint16_t ADC_ISR;
extern uint8_t ADC_FLAG;
extern void ADC_Init(void);
extern void ADC_Start(void);
extern void ADC_Stop(void);
extern uint16_t ADC_Read(void);
extern uint16_t ADC_Read_Blocking(void);

#endif /* ADC_H_ */
