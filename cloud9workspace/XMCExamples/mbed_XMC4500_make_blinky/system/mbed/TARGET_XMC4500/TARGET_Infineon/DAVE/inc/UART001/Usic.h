/*******************************************************************************
**                                                                            **
** Copyright (C) 2013 Infineon Technologies AG. All rights reserved.          **
**                                                                            **
** Infineon Technologies AG (Infineon) is supplying this software for use     **
** with Infineon's microcontrollers.                                          **
** This file can be freely distributed within development tools that are      **
** supporting such microcontrollers.                                          **
**                                                                            **
** THIS SOFTWARE IS PROVIDED "AS IS".  NO WARRANTIES, WHETHER EXPRESS,        **
** IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF **
** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE APPLY TO THIS         **
** SOFTWARE. INFINEON SHALL NOT, IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, ** 
** INCIDENTAL, OR CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER.           **
**                                                                            **
********************************************************************************
**                                                                            **
** PLATFORM : Infineon XMC4000/XMC1000 Series                                 **
**                                                                            **
** COMPILER : Compiler Independent                                            **
**                                                                            **
** AUTHOR   : App Developer                                                   **
**                                                                            **
** NOTE     : Any Changes made to this file will be overwritten during Code   **
**            Generation                                                      **
**                                                                            **
********************************************************************************
** VERSION HISTORY:
********************************************************************************
** 26 Mar 2013 V1.0.10  Changes from v1.0.4 are as follows
**                      1. Updated to support XMC1000 devices.
**                      2. Added file revision history
**                      3. Updated for the Macro USIC_FlushRxFIFO() and
**                      USIC_FlushTxFIFO() as per the UTP MCSW300000618.                     
** 30 May 2013 V1.0.16  Parity configuration defect fix. 
** 29 Nov 2013 V1.0.22  1. Removed DAVE3.h inclusion to fix the MISR warning for
**                      multiple includes.     
**                      2. Added device header file inclusion & uc_id.h 
**                      inclusion in the Usic.h file to get the device specific
**                      defines.
**                      3. Added doxygen tags.
**                      4. File Header alignment modified.
**                      5. Fixes for MISRA compliance.  
*******************************************************************************/
/**
 * @file Usic.h
 *
 * @brief  Header file for USIC defines. It provides enumerations, constants and 
 * data structure declarations required for the different USIC Modes.
 *
 */

#ifndef USIC_H_
#define USIC_H_

#ifdef __cplusplus
extern "C" {
#endif

/*******************************************************************************
**                      Include Files                                         **
*******************************************************************************/
/** Inclusion of Platform specific file */
#include <uc_id.h>

#if (__TARGET_DEVICE__ == XMC45)
#include <XMC4500.h>
#elif (__TARGET_DEVICE__ == XMC44)
#include <XMC4400.h>
#elif ((__TARGET_DEVICE__ == XMC42)||(__TARGET_DEVICE__ == XMC41))
#include <XMC4200.h>
#elif (__TARGET_DEVICE__ == XMC13)
#include <XMC1300.h>
#elif (__TARGET_DEVICE__ == XMC12)
#include <XMC1200.h>
#elif (__TARGET_DEVICE__ == XMC11)
#include <XMC1100.h>
#endif

/*******************************************************************************
**                      Global Macro Definitions                              **
*******************************************************************************/

/**
 * @ingroup UART001_constants
 * @{
 */

/** Normal divider mode selected */
#define USIC_NORMAL_DIV_SEL         (0x01U)
/** Frame length */
#define USIC_SCTR_FLE               (0x07U)
/** Word length */
#define USIC_SCTR_WLE               (0x07U)
/** Fractional divider mode selected */
#define USIC_FRACTIONAL_DIV_SEL     (0x02U) 
/** TX FIFO buffer contains 16 entries */
#define USIC_TBCTR_SIZE             (0x04U)
/** RX FIFO buffer contains 16 entries */
#define USIC_RBCTR_SIZE             (0x04U)
/** TX FIFO Data Pointer for Channel 0*/
#define USIC_TBCTR_CH0DPTR          (0x00U)
/** RX FIFO Data Pointer for Channel 0*/
#define USIC_RBCTR_CH0DPTR          (0x10U)

/** TX FIFO Data Pointer for Channel 1*/
#define USIC_TBCTR_CH1DPTR          (0x20U)
/** RX FIFO Data Pointer for Channel 1*/
#define USIC_RBCTR_CH1DPTR          (0x30U)

/** Reset value of USIC Registers */
#define USIC_REG_RESET              (0x00000000U)
/** Clear value of USIC Registers */
#define USIC_REG_CLEAR              (0xFFFFFFFFU)

/** Set USIC Channel in SSC mode  */
#define USIC_SPI_MODE               (0x01U)
/** Set USIC Channel in UART mode  */
#define UART_MODE                   (0x02U)
/** Set USIC Channel in IIS mode  */
#define I2S_MODE                    (0x03U)
/** Set USIC Channel in I2C mode  */
#define I2C_MODE                    (0x04U)
/** Ceiling Priority for App */
#define USIC_CEILING_PRIORITY       (2U) 

/**
 * @}
 */

/**
 * @ingroup UART001_apidoc
 * @{
 */
/** Macro  to get the status whether the receive buffer
 is currently updated by FIFO handler */  /* <<<DD_USIC_MACRO_1>>>*/
#define USIC_IsRxFIFObusy(Ch) RD_REG(Ch->TRBSR,USIC_CH_TRBSR_RBUS_Msk, \
                               USIC_CH_TRBSR_RBUS_Pos )

/** Macro  to get the status whether the transmit buffer is currently
 updated by FIFO handler. */ /* <<<DD_USIC_MACRO_2>>>*/
#define USIC_IsTxFIFObusy(Ch) RD_REG(Ch->TRBSR,USIC_CH_TRBSR_TBUS_Msk, \
                               USIC_CH_TRBSR_TBUS_Pos)
/** Macro  to check if Rx FIFO is full. */ /* <<<DD_USIC_MACRO_3>>>*/
#define USIC_IsRxFIFOfull(Ch) RD_REG(Ch->TRBSR,USIC_CH_TRBSR_RFULL_Msk , \
                               USIC_CH_TRBSR_RFULL_Pos)

/** Macro  to check if Tx FIFO is full. */ /* <<<DD_USIC_MACRO_4>>>*/
#define USIC_IsTxFIFOfull(Ch) RD_REG(Ch->TRBSR,USIC_CH_TRBSR_TFULL_Msk, \
                               USIC_CH_TRBSR_TFULL_Pos)

/** Macro  to check if Rx FIFO is empty. */ /* <<<DD_USIC_MACRO_5>>>*/
#define USIC_ubIsRxFIFOempty(Ch) RD_REG(Ch->TRBSR,USIC_CH_TRBSR_REMPTY_Msk, \
                               USIC_CH_TRBSR_REMPTY_Pos)

/** Macro  to check if Tx FIFO is empty. */ /* <<<DD_USIC_MACRO_6>>>*/
#define USIC_IsTxFIFOempty(Ch) RD_REG(Ch->TRBSR,USIC_CH_TRBSR_TEMPTY_Msk, \
                               USIC_CH_TRBSR_TEMPTY_Pos)

/** Macro  to get Rx FIFO filling level. */ /* <<<DD_USIC_MACRO_7>>>*/
#define USIC_GetRxFIFOFillingLevel(Ch) RD_REG(Ch->TRBSR,\
                                        USIC_CH_TRBSR_RBFLVL_Msk, \
                                        USIC_CH_TRBSR_RBFLVL_Pos)

/** Macro  to get  Tx FIFO filling level. */ /* <<<DD_USIC_MACRO_8>>>*/
#define USIC_GetTxFIFOFillingLevel(Ch)  RD_REG(Ch->TRBSR,\
                                         USIC_CH_TRBSR_TBFLVL_Msk, \
                                         USIC_CH_TRBSR_TBFLVL_Pos)

/** Macro  to Flush Rx FIFO */ /* <<<DD_USIC_MACRO_9>>>*/
#define USIC_FlushRxFIFO(Ch) SET_BIT(Ch->TRBSCR,USIC_CH_TRBSCR_FLUSHRB_Pos)
                                        
/** Macro  to Flush Tx FIFO */ /* <<<DD_USIC_MACRO_10>>>*/
#define USIC_FlushTxFIFO(Ch) SET_BIT(Ch->TRBSCR,USIC_CH_TRBSCR_FLUSHTB_Pos)



/**
 * @}
 */

/*******************************************************************************
**                      Global Type Definitions                               **
*******************************************************************************/

/**
 * @ingroup UART001_enumerations
 * @{
 */

/**
 * This type defines the available USIC channels.
 */
typedef enum USIC_ChannelType
{
  /** USIC 0 Channel 0 */
  USIC_U0C0,
  /** USIC 0 Channel 1 */
  USIC_U0C1,
  /** USIC 1 Channel 0 */
  USIC_U1C0,
  /** USIC 1 Channel 1 */
  USIC_U1C1,
  /** USIC 2 Channel 0 */
  USIC_U2C0,
  /** USIC 2 Channel 1 */
  USIC_U2C1
}USIC_ChannelType;
 
 
/**
 * This data type describes the Interrupt Service Request selected.
 */
typedef enum USIC_SRType
{
  /** Logical SR 0  selected */
  USIC_LOGICAL_SR0,
  /** Logical SR 1 selected */
  USIC_LOGICAL_SR1,
  /** Logical SR 2 selected */
  USIC_LOGICAL_SR2,
  /** Logical SR 3 selected */
  USIC_LOGICAL_SR3,
  /** Logical SR 4 selected */
  USIC_LOGICAL_SR4,
  /** Logical SR 5 selected */
  USIC_LOGICAL_SR5
}USIC_SRType; 


/**
 * This data type is used to describe the Uart Parity type.
 */
typedef enum  UART_ParityType
{
  /** No parity selected */
  UART_PARITY_NONE = 0,
  /** Even parity selected */
  UART_PARITY_EVEN = 2, 
  /** Odd parity selected */
  UART_PARITY_ODD = 3
}UART_ParityType;

/**
 * This data type is used to describe the Uart Stop bit type.
 */
typedef enum  UART_StopBitType
{
  /** One stop bit selected */
  UART_ONE_STOPBIT,
  /** Two stop bit selected */
  UART_TWO_STOPBIT
}UART_StopBitType;

/**
 * This data type is used to describe the Uart Mode section
 */
typedef enum  UART_ModeType
{
  /** Full Duplex mode selected */
  UART_FULLDUPLEX,
  /** Half Duplex mode selected */
  UART_HALFDUPLEX,
  /** LoopBack mode selected */
  UART_LOOPBACK,
  /** IrDA mode selected */
  UART_IRDA
}UART_ModeType;


/**
 * @}
 */
/*******************************************************************************
**                      Global Constant Declarations                          **
*******************************************************************************/


/*******************************************************************************
**                      Extern Variables                                      **
*******************************************************************************/


/*******************************************************************************
** FUNCTION PROTOTYPES                                                        **
*******************************************************************************/

#ifdef __cplusplus
}
#endif 

#endif /* USIC_H_ */
