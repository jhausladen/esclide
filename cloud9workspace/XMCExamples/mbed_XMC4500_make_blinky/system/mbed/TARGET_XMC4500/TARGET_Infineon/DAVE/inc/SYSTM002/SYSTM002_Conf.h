/*******************************************************************************
**  DAVE App Name : SYSTM002       App Version: 1.0.12               
**  This file is generated by DAVE, User modification to this file will be    **
**  overwritten at the next code generation.                                  **
*******************************************************************************/


/*******************************************************************************
**                                                                            **
** Copyright (C) 2014 Infineon Technologies AG. All rights reserved.          **
**                                                                            **
** Infineon Technologies AG (Infineon) is supplying this software for use     **
** with Infineon's microcontrollers.                                          **
** This file can be freely distributed within development tools that are      **
** supporting such microcontrollers.                                          **
**                                                                            **
** THIS SOFTWARE IS PROVIDED "AS IS".  NO WARRANTIES, WHETHER EXPRESS,        **
** IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES    **
** OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE APPLY TO THIS      **
** SOFTWARE. INFINEON SHALL NOT, IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, **
** INCIDENTAL, OR CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER.           **
**                                                                            **
********************************************************************************
**                                                                            **
** PLATFORM : Infineon XMC1000/XMC4000 Series                                 **
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
** v1.0.0, 25 Sep 2013,  SSS: Initial version for XMC1000/XMC4000 series.
** v1.0.2  10 Oct 2013,  SSS: 1.C++ codebase support is added.
**                            2.macros are renamed 
**                               a. PRIORITY to SYSTM002_PRIORITY
**                               b. SUBPRIORITY to SYSTM002_SUBPRIORITY
**                            3.Variable systick is renamed as SYSTM002_Systick
**
** v1.0.6  29 Jan 2014,  SSM: 1. DBG002 App changes are taken care.
**                             
** V1.0.8  06 Feb 2014,     : 1. XMC1000 VQFN package support added;   
**                         XMC4000 Device support extended for XMC4500 AC step,
**                                XMC4400 AB Step and XMC4200 AB Step. 
**
** V1.0.10 25 Feb 2014,  SSM: 1. Floating point multiplication and Division     
**                                  inside API are removed. 
**                            2. SYSTM002_GetSysTickCount(uint32_t Period)API 
**                                removed and it is replaced with the macro
**                                 SYSTM002_SysTickMicroSec(microsec)
**
** V1.0.12 23 Apr 2014,  SSM: 1. Fixes Floating operation issue 
**                                in XMC4x series.
**
*******************************************************************************/

/**
 * @file SYSTM002_Conf.h
 *
 * @brief This file contains extern declarations and global macro definitions 
 * of SYSTM002.
 *
 */

#ifndef SYSTM002_CONF_H_
#define SYSTM002_CONF_H_

/* Support for C++ codebase */
#ifdef __cplusplus
extern "C" {
#endif
/*******************************************************************************
** INCLUDE FILES:
*******************************************************************************/


/*******************************************************************************
** GLOBAL MACRO DEFINITIONS:                   
*******************************************************************************/
/**
 * @ingroup SYSTM002_constants
 * @{
 */
/* Priority group */
#define SYSTM002_PRIORITY     10U
#define SYSTM002_SUBPRIORITY  0U

/* System Core clock frequency in Hz multiplied by 1000000
*  changes has done to avoid Float operation
*/
#define SYSTM002_SYS_CORE_CLOCK  120000000U

/* Time between two systick interrupt in usec */
#define SYSTM002_SYSTICK_INTERVAL 1000U
/* Maximum Number of timer */
#define SYSTM002_CFG_MAX_TMR  32U 

/**
 * @}
 */


/*******************************************************************************
** GLOBAL TYPE DEFINITIONS:                     
*******************************************************************************/

/*******************************************************************************
** GLOBAL VARIABLE DEFINITIONS: 
*******************************************************************************/

/*******************************************************************************
** FUNCTION PROTOTYPES:
*******************************************************************************/
/**
 * @ingroup SYSTM002_apidoc
 * @{
 */

/**
 * @}
 */

/*******************************************************************************
** ENUMERATIONS:
*******************************************************************************/
/**
  * @ingroup SYSTM002_publicparam
  * @{
  */

/**
 * @}
 */

/*******************************************************************************
** STRUCTURES:
*******************************************************************************/

/* Support for C++ codebase */
#ifdef __cplusplus
}
#endif   

#endif /* SYSTM002_CONF_H_ */

/*CODE_BLOCK_END*/


