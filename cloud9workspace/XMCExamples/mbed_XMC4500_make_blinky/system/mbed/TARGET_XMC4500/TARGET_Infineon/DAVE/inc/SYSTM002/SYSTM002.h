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
** v1.0.0, 25 Sep 2013,   SSS: Initial version for XMC1000/XMC4000 series.
** v1.0.2  10 Oct  2013,  SSS: 1.Conditional code is added for all the devices.
**                             2.Supported for C++ codebase.
**                             3.New macros are added.
** v1.0.6  29 Jan  2014,  SSM: 1. DBG002 App changes are taken care.
**                             
** V1.0.8  06 Feb  2014,     : 1. XMC1000 VQFN package support added;   
**                         XMC4000 Device support extended for XMC4500 AC step,
**                                XMC4400 AB Step and XMC4200 AB Step.
**  
** V1.0.10 25 Feb  2014,  SSM: 1. Floating point multiplication and Division     
**                                  inside API are removed. 
**                             2. SYSTM002_GetSysTickCount(uint32_t Period)API 
**                                removed and it is replaced with the macro
**                                SYSTM002_SysTickMicroSec(microsec)
** V1.0.12 23 Apr  2014,  SSM: 1. Fixes Floating operation issue 
**                                in XMC4x series.
**
*******************************************************************************/
/**
 * @file SYSTM002.h
 *
 * @brief  This file contains Enumerations, Structure definitions and function 
 * prototypes of SYSTM002.
 *
 */

#ifndef SYSTM002_H_
#define SYSTM002_H_

/* Support for C++ codebase */
#ifdef __cplusplus
extern "C" {
#endif

/*******************************************************************************
** INCLUDE FILES:                                                          
*******************************************************************************/
#include <uc_id.h>
#if (__TARGET_DEVICE__ == XMC45)
#include <XMC4500.h>
#elif (__TARGET_DEVICE__ == XMC44)
#include <XMC4400.h>
#elif ((__TARGET_DEVICE__ == XMC42) || (__TARGET_DEVICE__ == XMC41))
#include <XMC4200.h>
#elif (__TARGET_DEVICE__ == XMC11)
#include <XMC1100.h>
#elif (__TARGET_DEVICE__ == XMC12)
#include <XMC1200.h>
#elif (__TARGET_DEVICE__ == XMC13)
#include <XMC1300.h>
#else
#error "Unsupported XMC family"
#endif
#ifdef DAVE_CE
#include "SYSTM002_Conf.h"
#endif
#include "../../inc/LIBS/types.h"

/*******************************************************************************
** GLOBAL MACRO DEFINITIONS:                                               
*******************************************************************************/
/**
 * @ingroup SYSTM002_constants
 * @{
 */

/* definition to check the timer configuration status */
#define SYSTM002_TIMER_CONFIGURATION_SUCCESS  0UL
/* definition to check the timer configuration status */
#define SYSTM002_TIMER_CONFIGURATION_FAILURE 1U
/* definition to check the timer creation status */
#define SYSTM002_TIMER_CREATION_FAILURE  1UL
/* definition to set the bit */
#define SYSTM002_BIT_SET  1UL
/* definition to increment the count */
#define SYSTM002_INCREMENT_COUNT 1U
/* Macro for 1 MHz */
#define SYSTM002_ONE_MHZ 1000000U
/* Integer part of System Clock  */
#define SYSTM002_TICKUS_I    (uint16_t)(SYSTM002_SYS_CORE_CLOCK / SYSTM002_ONE_MHZ)
/* Fractional part of System Clock  */
#define SYSTM002_TICKUS_F    (uint16_t)((((SYSTM002_SYS_CORE_CLOCK / SYSTM002_ONE_MHZ) - \
                         (int)(SYSTM002_SYS_CORE_CLOCK / SYSTM002_ONE_MHZ)) * (1U << 16U)))

/* Macro to get the number of system ticks for the 
 * specified period in microseconds 
 */
#define SYSTM002_SysTickMicroSec(microsec) ((microsec * SYSTM002_TICKUS_I) + \
                                            ((microsec * SYSTM002_TICKUS_F) >> 16U))
                                            
/* Macro to get the period ratio by dividing it
 * with the SYSTICK INTERVAL
 */
#define SYSTM002_PeriodRatioSysClockInterval(period)  \
                                (period / SYSTM002_SYSTICK_INTERVAL)
/**
 * @}
 */

/*******************************************************************************
** GLOBAL VARIABLE DEFINITIONS: 
*******************************************************************************/

/*******************************************************************************
** ENUMERATIONS:                                                        
*******************************************************************************/
/**
 * @ingroup SYSTM002_enumerations
 * @{
 */

/*
 * This enumeration defines possible timer state.
 */
typedef enum SYSTM002_TimerStateType{
/**
 * The timer is in running state
 */
  SYSTM002_STATE_RUNNING,
/**
  * The timer is stopped
  */
  SYSTM002_STATE_STOPPED
}SYSTM002_TimerStateType;

/**
 * Enum values which describes timer types
 */
typedef enum SYSTM002_TimerType
{
  /**
    * Timer Type is one shot.
    */
  SYSTM002_ONE_SHOT,
  /**
   * Timer Type is periodic.
   */
  SYSTM002_PERIODIC
}SYSTM002_TimerType;

/**
 * Enum values which describes return status of functions
 */
typedef enum SYSTM002_ErrorCodesType
{
  /**
   * Invalid Handle.
   */
  /**
   * @cond INTERNAL_DOCS
   * @param MODULENAME SYSTM002
   * @endcond
   */
  /**
   * @cond INTERNAL_DOCS
   * @param	ERRCODESTRING1 SYSTM002_INVALID_HANDLE_ERROR
   * @param	STRCODESTRING1 Input handle is not valid
   * @endcond
   */
  SYSTM002_INVALID_HANDLE_ERROR = 1U,
  /**
   * Timer error occurred.
   */
  /**
   * @cond INTERNAL_DOCS
   * @param	ERRCODESTRING2 SYSTM002_ERROR
   * @param	STRCODESTRING2 Timer Error
   * @endcond
   */
  SYSTM002_ERROR,
  /**
   * Debug log function entry.
   */
  /**
   * @cond INTERNAL_DOCS
   * @param	ERRCODESTRING3 SYSTM002_FUNCTION_ENTRY
   * @param	STRCODESTRING3 Entered function \%s
   * @endcond
   *
   */
  SYSTM002_FUNCTION_ENTRY,
  /**
   * Debuglog function exit.
   */
  /**
   * @cond INTERNAL_DOCS
   * @param ERRCODESTRING4 SYSTM002_FUNCTION_EXIT
   * @param STRCODESTRING4 Exited function \%s
   * @endcond
   */
  SYSTM002_FUNCTION_EXIT
}SYSTM002_ErrorCodesType;

/**
 * @}
 */

/*******************************************************************************
** GLOBAL TYPE DEFINITIONS:                     
*******************************************************************************/
/**
  * @ingroup SYSTM002_datastructures
  * @{
  */

/**
 * Timer callback function pointer.
 */
typedef void (*SYSTM002_TimerCallBackPtr)(void* ParamToCallBack);

/**
 * Global structure which acts as the timer control block .
 *  
 */
typedef struct SYSTM002_TimerObject
{
  /* <<<DD_SYSTM002_STRUCT_1>>> */
  /** Timer ID  */
  uint32_t TimerID;
  /** Timer Type (Single Shot or Periodic) */
  SYSTM002_TimerType TimerType;
  /** Timer State  */
  SYSTM002_TimerStateType TimerState;
  /** Timer Counter  */
  uint32_t TimerCount;
  /** Timer Reload Counter value */
  uint32_t TimerReload;
  /** Callback function pointer */
  SYSTM002_TimerCallBackPtr TimerCallBack;
  /** Parameter to callback function */
  void* ParamToCallBack;
  /** pointer to next timer control block */
  struct SYSTM002_TimerObject*  TimerNext;
  /** Pointer to previous timer control block */
  struct SYSTM002_TimerObject*  TimerPrev;
}SYSTM002_TimerObject;

/**
 * @}
 */
 
/*******************************************************************************
** FUNCTION PROTOTYPES:
*******************************************************************************/
/**
 * @ingroup SYSTM002_apidoc
 * @{
 */


/**
 * Initializes the systick counter as per the systick interval specified by the 
 * user and start the systick counter. It also initializes global variables.
 *
 * @return     void
 *
 *
 * <b>Reentrant: NO </b><BR>
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 *  #include <DAVE3.h>
 *  int main(void)
 *  {
 *    // Initialize and Systick counter
 *    DAVE_Init(); // SYSTM002_Init() will be called within DAVE_Init()
 *    // ... infinite loop ...
 *    while(1)
 *    {
 *    
 *    }
 *     
 *  }
 * @endcode<BR> </p>
 */
void  SYSTM002_Init( void);


/**
 *  Creates a new software Timer.
 *  
 *  Note : This App uses SysTick Exception for controlling the timer list. 
 *  Call back function registered through this function will be called in 
 *  SysTick  exception when the timer is expired.
 *  One shot timers are removed from the timer list, if it expires. To use
 *  this SW timer again it has to be first deleted and then created again. 
 *  Periodic timer will be added again to the timer list with the same periodic
 *  value after it expires.
 *
 *
 * @param[in]  Period Timer period value in microseconds
 * @param[in]  TimerType Type of Timer(ONE_SHOT/PERIODIC)
 * @param[in]  TimerCallBack Call back function of the timer(No Macros are 
 *             allowed)
 * @param[in]  pCallBackArgPtr Call back function parameter
 *
 * @return     handle_t<BR> 
 *             Timer ID : If timer created successfully.<BR>
 *             0  : If timer creation failed.<BR>
 *
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 *  #include <DAVE3.h>
 * static volatile bool TimerExpired;
 * void my_func_a(void)
 *  {
 *    static uint32_t Count = 1U;
 *    if(Count == 10U)
 *    {
 *      TimerExpired = TRUE;
 *    }
 *    Count++;
 *  }
 *  int main(void)
 *  {
 *    handle_t TimerId;
 *    // ... Initializes Apps configuration ...
 *    DAVE_Init();
 *    TimerId = SYSTM002_CreateTimer(100U,SYSTM002_PERIODIC,(void*)my_func_a,NULL);
 *    if(TimerId != 0U)
 *    {
 *    //Timer is created successfully
 *    }
 *    // ... infinite loop ...
 *    while(1)
 *    {
 *    
 *    }
 *     
 *  }
 * @endcode<BR> </p>
 */
handle_t SYSTM002_CreateTimer
(
  uint32_t Period,
  SYSTM002_TimerType TimerType,
  SYSTM002_TimerCallBackPtr TimerCallBack,
  void  *pCallBackArgPtr
);

/**
 * Starts the software timer .
 *
 *
 * @param[in]  Handle Timer ID obtained from SYSTM002_CreateTimer
 *
 * @return     status_t<BR>
 *             DAVEApp_SUCCESS        : If timer is started successfully<BR>
 *             SYSTM002_INVALID_HANDLE  : If Timer ID  passed is invalid<BR>
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 *  #include <DAVE3.h>
 *  static volatile bool TimerExpired; 
 *  void my_func_a(void)
 *  {
 *    static uint32_t Count = 1U;
 *    if(Count == 10U)
 *    {
 *      TimerExpired = TRUE;
 *    }
 *    Count++;
 *  }
 *  int main(void)
 *  {
 *    handle_t TimerId;
 *    uint32_t Status = SYSTM002_ERROR;
 *    // ... Initializes Apps configuration ...
 *    DAVE_Init();
 *    TimerId = SYSTM002_CreateTimer(100U,SYSTM002_PERIODIC,(void*)my_func_a,NULL);
 *    if(TimerId != 0U)
 *    {
 *      //Timer is created successfully
 *   Status = SYSTM002_StartTimer(TimerId);
 *   if(Status == DAVEApp_SUCCESS)
 *   {
 *            //Timer started
 *   }
 * }
 *    // ... infinite loop ...
 *    while(1)
 *    {
 *    
 *    }
 *  }
 * @endcode<BR> </p>
 */
status_t SYSTM002_StartTimer(handle_t  Handle) ;


/**
 * Stops the software timer
 *
 * @param[in]  Handle Timer ID obtained from SYSTM002_CreateTimer
 *
 * @return     status_t<BR>
 *             DAVEApp_SUCCESS : if timer is stopped successfully.<BR>
 *             SYSTM002_INVALID_HANDLE  : If Timer ID  passed is invalid.<BR>
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 *  #include <DAVE3.h>
 *  static volatile bool TimerExpired;
 *  void my_func_a(void)
 *  {
 *   static uint32_t Count = 1U;
 *   if(Count == 10U)
 *   {
 *     TimerExpired = TRUE;
 *   }
 *    Count++;
 *  }
 *  int main(void)
 *  {
 *    handle_t TimerId;
 *   uint32_t Status = SYSTM002_ERROR;
 *   // ... Initializes Apps configuration...
 *    DAVE_Init();
 *    TimerId = SYSTM002_CreateTimer(100U,SYSTM002_PERIODIC,(void*)my_func_a,NULL);
 *    if(TimerId != 0U)
 *    {
 *      //Timer is created successfully
 *    Status = SYSTM002_StartTimer(TimerId);
 *      if(Status == DAVEApp_SUCCESS)
 *    {
 *       // Wait till timer is expired
 *       while(TimerExpired == FALSE)
 *         {}
 *    //stop the timer
 *    Status = SYSTM002_StopTimer(TimerId);
 *        if(Status == DAVEApp_SUCCESS)
 *    {
 *          //Timer stopped
 *    }
 *       }
 *       // start the timer
 *        SYSTM002_StartTimer(TimerId);
 *    }
 *    // ... infinite loop ...
 *    while(1)
 *    {
 *     
 *    }
 *      
 * }
 * @endcode<BR> </p>
 */
status_t SYSTM002_StopTimer(handle_t Handle) ;

/**
 * Deletes the software timer from the timer list.
 *  
 *  Note : One shot timers are removed from the timer list, if it expires. To 
 *  use  this SW timer again it has to be first deleted and then created again. 
 *  Periodic timer will be added again to the timer list with the same periodic
 *  value after it expires.
 *
 *
 * @param[in]  Handle Timer ID
 *
 * @return     status_t<BR>
 *             DAVEApp_SUCCESS 			: if timer is deleted successfully.<BR>
 *             SYSTM002_INVALID_HANDLE  : If Timer ID  passed is invalid.<BR>
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 *  #include <DAVE3.h>
 *  static volatile bool TimerExpired;
 *  void my_func_a(void)
 *  {
 *   static uint32_t Count = 1U;
 *   if(Count == 10U)
 *   {
 *     TimerExpired = TRUE;
 *   }
 *   Count++;
 *  }
 *  int main(void)
 *  {
 *    handle_t TimerId;
 *    uint32_t Status = SYSTM002_ERROR;
 *    // ... Initializes Apps configuration ...
 *    DAVE_Init();
 *    TimerId = SYSTM002_CreateTimer(100U,SYSTM002_PERIODIC,(void*)my_func_a,NULL);
 *    if(TimerId != 0U)
 *    {
 *      //Timer is created successfully
 *      Status = SYSTM002_StartTimer(TimerId);
 *      if(Status == DAVEApp_SUCCESS)
 *    {
 *        // Wait till timer is expired
 *        while(TimerExpired == FALSE)
 *        {}
 *      //stop the timer
 *      Status = SYSTM002_StopTimer(TimerId);
 *        if(Status == DAVEApp_SUCCESS)
 *      {
 *        SYSTM002_DeleteTimer(TimerId);
 *      }
 *      }
 *    }    
 *    // ... infinite loop ...
 *    while(1)
 *    {
 *     
 *    } 
 * }
 * @endcode<BR> </p>
 */
status_t SYSTM002_DeleteTimer(handle_t Handle) ;


/**
 * Gives the current system time in microsec since start of counter.
 *
 *
 * @return     uint32_t returns current system time in microsec.
 *
 *
 * <b>Reentrant: NO </b><BR>
 *
 * <BR><P ALIGN="LEFT"><B>Example:</B>
 * @code
 *  #include <DAVE3.h>
 *  static volatile bool TimerExpired; 
 *  void my_func_a(void)
 *  {
 *    static uint32_t Count = 1U;
 *    if(Count == 10U)
 *    {
 *      TimerExpired = TRUE;
 *    }
 *    Count++;
 *  }
 *  int main(void)
 *  {
 *    handle_t TimerId;
 *    uint32_t SystemTime = 0U;
 *    uint32_t Status = SYSTM002_ERROR;
 *    // ... Initializes Apps configuration ...
 *    DAVE_Init();
 *    TimerId = SYSTM002_CreateTimer(100U,SYSTM002_PERIODIC,(void*)my_func_a,NULL);
 *    if(TimerId != 0U)
 *    {
 *      //Timer is created successfully
 *      Status = SYSTM002_StartTimer(TimerId);
 *      if(Status == DAVEApp_SUCCESS)
 *      {
 *        SystemTime = SYSTM002_GetTime();
 *      }
 *    }
 *     // ... infinite loop ...
 *    while(1)
 *    {
 *    
 *    }
 * }
 * @endcode<BR> </p>
 */
extern uint32_t  SYSTM002_GetTime(void);

/**
 *@}
 */

/*******************************************************************************
** STRUCTURES:
*******************************************************************************/
/* Support for C++ codebase */
#ifdef __cplusplus
}
#endif   

#endif /* SYSTM002_H_ */   

/*CODE_BLOCK_END*/

