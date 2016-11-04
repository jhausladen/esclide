/*******************************************************************************
 *
 * Copyright (C) 2014 Infineon Technologies AG. All rights reserved.
 *
 * Infineon Technologies AG (Infineon) is supplying this software for use with
 * Infineon’s microcontrollers.
 * This file can be freely distributed within development tools that are
 * supporting such microcontrollers.
 *
 * THIS SOFTWARE IS PROVIDED "AS IS".  NO WARRANTIES, WHETHER EXPRESS, IMPLIED
 * OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE APPLY TO THIS SOFTWARE.
 * INFINEON SHALL NOT, IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, INCIDENTAL,
 * OR CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER.
 *
********************************************************************************
**                                                                            **
**                                                                            **
** PLATFORM : Infineon XMC4000/XMC1000 Series                                 **
**                                                                            **
** COMPILER : Compiler Independent                                            **
**                                                                            **
** AUTHOR   : App Developer                                                   **
**                                                                            **
** MAY BE CHANGED BY USER [yes/no]: Yes                                       **
**                                                                            **
** MODIFICATION DATE : Jan 20, 2014                                           **
**                                                                            **
**                                                                            **
*******************************************************************************/

/*******************************************************************************
**                       Author(s) Identity                                   **
********************************************************************************
**                                                                            **
** Initials     Name                                                          **
** ---------------------------------------------------------------------------**
** SNR    App Developer                                                       **
*******************************************************************************/

/**
 * @file IO001.h
 *
 * @brief Header file for IO_Analog_IO001 App
 *
 */

#ifndef IO001_H_
#define IO001_H_

#ifdef __cplusplus
extern "C" {
#endif
/*******************************************************************************
**                      Include Files                                         **
*******************************************************************************/
#include <DAVE3.h>

/*******************************************************************************
**                      Global Macro Definitions                              **
*******************************************************************************/


/*******************************************************************************
**                      Global Macro Definitions                              **
*******************************************************************************/

/**
 * @ingroup IO001_publicparam
 * @{
 */

/*******************************************************************************
**                      Global Type Definitions                               **
*******************************************************************************/
/**
* PORTS
*/
typedef struct {
__IO uint32_t   OUT;     /*!<   Port 0 Output Register Offset  0x00000000   */
__O uint32_t    OMR;     /*!<   Port 0 Output Modification Register Offset  0x00000004   */
__I  uint32_t   RESERVED1[2];     /*!<      */
__IO uint32_t   IOCR0;     /*!<   Port 0 Input/Output Control Register 0 Offset  0x00000010   */
__IO uint32_t   IOCR4;     /*!<   Port 0 Input/Output Control Register 4 Offset  0x00000014   */
__IO uint32_t   IOCR8;     /*!<   Port 0 Input/Output Control Register 8 Offset  0x00000018   */
__IO uint32_t   IOCR12;     /*!<   Port 0 Input/Output Control Register 12 Offset  0x0000001C   */
__I  uint32_t   RESERVED2[1];     /*!<      */
__I uint32_t    IN;     /*!<   Port 0 Input Register Offset  0x00000024   */
__I  uint32_t   RESERVED3[6];     /*!<      */
__IO uint32_t   PDR0;     /*!<   Port 0 Pad Driver Mode 0 Register Offset  0x00000040   */
__IO uint32_t   PDR1;     /*!<   Port 0 Pad Driver Mode 1 Register Offset  0x00000044   */
__I  uint32_t   RESERVED4[6];     /*!<      */
__IO uint32_t   PDISC;     /*!<   Port 0 Pin Function Decision Control Register Offset  0x00000060   */
__I  uint32_t   RESERVED5[3];     /*!<      */
__IO uint32_t   PPS;     /*!<   Port 0 Pin Power Safe Register Offset  0x00000070   */
__IO uint32_t   HWSEL;     /*!<   Port 0 Pin Hardware Select Register Offset  0x00000074   */
}IO001_PORTS_TypeDef;

/**
 *This data type describes the App Handle
 */
typedef struct IO001_HandleType
{
  /** Port Number */
  uint8_t PortNr;
  /** Port pins */
  uint8_t PortPin;
  /** Port Regs */
  IO001_PORTS_TypeDef* PortRegs;
}IO001_HandleType;

/**
 * This data type describes the Input Mode type
 */ 

typedef enum IO001_InputModeType
{
  /** Tri-state */
  IO001_TRISTATE,
  /** Input pull-down device connected */
  IO001_PULL_DOWN_DEVICE,
  /** Input pull-up device connected */
  IO001_PULL_UP_DEVICE,
  /** Pn_OUTx continuously polls the input value */
  IO001_CONT_POLLING,
  /** Inverted tri-state */
  IO001_INV_TRISTATE,
  /** Inverted Input pull-down device connected */
  IO001_INV_PULL_DOWN_DEVICE,
  /** Inverted Input pull-up device connected */
  IO001_INV_PULL_UP_DEVICE,
  /** Inverted Pn_OUTx continuously polls the input value */
  IO001_INV_CONT_POLLING,
}IO001_InputModeType;

 
 /**
  * @}
  */
/*******************************************************************************
** FUNCTION PROTOTYPES                                                        **
*******************************************************************************/
/**
 * @ingroup IO001_apidoc
 * @{
 */

 /**
 * Initialises all the App instances based on user configuration
 *
 *
 *
 * @return     None
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 * #include <DAVE3.h>
 *
 *  int main(void)
 *  {
 *    DAVE_Init();  // IO001_Init() is called within DAVE_Init()
 *    return 0;
 *  }
 * @endcode<BR> </p>
 */
void IO001_Init(void);

/**
 * @}
 */


/**
 * @ingroup IO001_apidoc
 * @{
 */

/**
 * This macro reads value at  portpin.
 *              
 *
 * @param[in]  Handle to Port Pin App Instance
 *
 * @return     Value at Pin
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 * #include <DAVE3.h>
 *
 *  int main(void)
 *  {
 *    bool Value = 0;
 *    DAVE_Init(); // IO001_Init() is called within DAVE_Init()
 *    Value = IO001_ReadPin(IO001_Handle0);
 *    return 0;
 *  }
 * @endcode<BR> </p>
 *
 */
#define IO001_ReadPin(Handle ) (((Handle.PortRegs->IN) >> Handle.PortPin) & 1U)

/**
 * This macro is kept for backward compatibility.
 * It is defined as empty. The Analog mode is always enabled in the h/w.
 * Hence this macro is not required.
 *              
 */
#define IO001_EnableAnalogInput(Handle)
/**
 * The chosen portpin is configured as input.
 * 
 *            The following definitions for Mode are available:<BR>
 *              IO001_TRISTATE              (no pull device connected)<BR>
 *              IO001_PULL_DOWN_DEVICE      (pull-down device connected)<BR>
 *              IO001_PULL_UP_DEVICE        (pull-up device connected)<BR>
 *              IO001_CONT_POLLING          (Pn_OUTx continuously samples input value)<BR>
 *              IO001_INV_TRISTATE          (Inverted no pull device connected)<BR>
 *              IO001_INV_PULL_DOWN_DEVICE  (Inverted pull-down device connected)<BR>
 *              IO001_INV_PULL_UP_DEVICE    (Inverted pull-up device connected)<BR>
 *              IO001_INV_CONT_POLLING 	    (Pn_OUTx continuously samples input value)<BR>
 *
 *
 * @param[in]  Handle to Port Pin App Instance
 * @param[in]  Mode Input selection(Pull-Down,Pull-Up,Inv-Pull-Down,Inv-Pull-Up)
 *             for chosen port pin
 *
 * @return    None
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 * #include <DAVE3.h>
 *
 *  int main(void)
 *  {
 *    DAVE_Init(); // IO001_Init() is called within DAVE_Init()
 *    IO001_EnableDigitalInput(&IO001_Handle0,IO001_PULL_UP_DEVICE);
 *    return 0;
 *  }
 * @endcode<BR> </p>
 */

void IO001_EnableDigitalInput(const IO001_HandleType* Handle,IO001_InputModeType Mode);


/**
 * The function disables the digital input mode for the port pin
 *
 * @param[in]  Handle to Port Pin App Instance
 *
 * @return    None
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 * #include <DAVE3.h>
 *
 *  int main(void)
 *  {
 *    DAVE_Init(); // IO001_Init() is called within DAVE_Init()
 *    IO001_DisableDigitalInput(&IO001_Handle0);
 *    return 0;
 *  }
 * @endcode<BR> </p>
 */

void IO001_DisableDigitalInput(const IO001_HandleType* Handle);

/* Inclusion of App config file */
#include "IO001_Conf.h"

#ifdef __cplusplus
}
#endif
#endif /* IO001_H_ */

/*CODE_BLOCK_END*/

