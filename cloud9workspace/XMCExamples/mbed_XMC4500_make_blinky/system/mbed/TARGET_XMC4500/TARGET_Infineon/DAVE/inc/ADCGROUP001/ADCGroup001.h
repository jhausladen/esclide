/******************************************************************************
 *
 * Copyright (C) 2013 Infineon Technologies AG. All rights reserved.
 *
 * Infineon Technologies AG (Infineon) is supplying this software for use with
 * Infineon's microcontrollers.
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
** PLATFORM : Infineon XMC4000 Series                                         **
**                                                                            **
** COMPILER : Compiler Independent                                            **
**                                                                            **
** AUTHOR   : DAVE App Developer                                              **
**                                                                            **
** MAY BE CHANGED BY USER [yes/no]: Yes                                       **
**                                                                            **
** MODIFICATION DATE : Jun 09, 2014                                          **
**                                                                            **
*******************************************************************************/
/*******************************************************************************
**                       Author(s) Identity                                   **
********************************************************************************
**                                                                            **
** Initials     Name                                                          **
** CM           DAVE App Developer                                            **
** ---------------------------------------------------------------------------**
**                                                                            **
*******************************************************************************/

/**
 * @file ADCGROUP001.h
 *
 * @brief This header file contains the data structures and function prototypes 
 *        of ADCGROUP001 App
 *
 * Change History:
 * Date       version       Details
 * 01-Jan-2013   1.0.6    Initial code added for XMC1000
 * 29-Jan-2013   1.0.8    Merging with XMC1000 done
 * 09-Apr-2013   1.0.12   Channel selection style is removed and made EMXCSS=1
 *                        always
 * 24-Apr-2013   1.0.14   Ported to XMC4500 step AB 
 * 11-Jun-2013   1.0.16   1.Variable name in manifest is corrected.
 *                        2.In the Header comment section device name changed to
 *                         XMC1000.
 *                        3.copy right year changed to 2013
 * 11-Sep-2013   1.0.20   1. Analog converter control(ANONC) Code sequence
 *                           corrected.
 *                        2. Added support for the following devices under 
 *                        XMC1200 and XMC1300 Series - XMC1201, XMC1202, XMC1301
 * 09-Jun-2014   1.0.28   ADC conversion time calculations are updated for XMC1X 
 *                        devices.
 *                     
 */
#ifndef ADCGROUP001_H_
#define ADCGROUP001_H_

#ifdef __cplusplus
extern "C" {
#endif

/*****************************************************************************
 * INCLUDE FILES
 *****************************************************************************/
#include <DAVE3.h>


/******************************************************************************
**                      Global Macro Definitions                              **
*******************************************************************************/
/** Maximum service request nodes */
#define ADCGROUP001_MAX_SERVICE_REQUEST_NODE  4

/** Maximum ADC channels per group */
#define ADCGROUP001_MAX_ADC_GROUP_CHANNEL  8

/** Total numer of ADC channels */
#define ADCGROUP001_TOTAL_ADC_CHANNEL    32

/** Maximum group specific boundary */
#define ADCGROUP001_MAX_BOUNDARY_VALUE  4096

/** Maximum group specific boundary */
#define ADCGROUP001_MAX_SAMPLE_TIME_CONTROL_VAL  32
/*******************************************************************************
**                      Global Type Definitions                               **
*******************************************************************************/

/**
 * @ingroup ADCGROUP001_publicparam
 * @{
 */
/*******************************************************************************
 *                                ENUMERATIONS                                **
 ******************************************************************************/
/**
 * This enumerates the state of the App.
 */
typedef enum ADCGROUP001_StateType
{
  /**
   * This is the Default state of an APP after power on reset.
   */
  ADCGROUP001_UNINITIALIZED,
  /**
   * This is the INITIALIZED state in which APP is initialized as per selected
   * parameters.
   */
  ADCGROUP001_INITIALIZED
}ADCGROUP001_StateType;


/**
 * This will enumerate the error codes which will be returned from a function.
 */
typedef enum ADCGROUP001_ErrorCodesType
{
  /**
   * This code would be returned when any operation is not possible cause that
   * operation was tried in invalid state
   */
    /*
    GROUPID  #41
    MODULENAME = ADCGROUP001
    */
    /*
    ERRCODESTRING = ADCGROUP001_OPER_NOT_ALLOWED_ERROR
    STRCODESTRING = Function execution is not allowed in the current state
    */  
  ADCGROUP001_OPER_NOT_ALLOWED_ERROR = 1,
  /**
   * This code is returned when parameter passed to the API is invalid
   */
  /*
  ERRCODESTRING = ADCGROUP001_INVALID_PARAM_ERROR
  STRCODESTRING = Input parameter is not valid
  */ 
  ADCGROUP001_INVALID_PARAM_ERROR,
  /**
   * This code is returned when number of events exceed 4294967295 (32-bit).
   */
  /*
  ERRCODESTRING = ADCGROUP001_OUT_OF_RANGE_ERROR
  STRCODESTRING = number of events exceed 4294967295 (32-bit)
  */  
  ADCGROUP001_OUT_OF_RANGE_ERROR,

  /** Debug log messages */
  /**
   * Message Id for function Entry
   */
  /*
  ERRCODESTRING = ADCGROUP001_FUN_ENTRY
  STRCODESTRING = Function entered
  */ 
  ADCGROUP001_FUNCTION_ENTRY,
  /**
   * Message ID for function exit
   */
  /*
  ERRCODESTRING = ADCGROUP001_FUN_EXIT
  STRCODESTRING = Function exited
  */ 
  ADCGROUP001_FUNCTION_EXIT,
}ADCGROUP001_ErrorCodesType;

/**
 * This enumerates the Post calibration enable or disable
 */
typedef enum ADCGROUP001_PostCalibrationType{
    /**
     * Automatic post calibration
     */
    ADCGROUP001_AUTOPOSTCALIBRATION = 0,
    /**
     * No post calibration
     */
    ADCGROUP001_POSTCALIBRATIONDISABLE,
}ADCGROUP001_PostCalibrationType;

/**
 * This enumerates the arbitration mode
 */
typedef enum ADCGROUP001_ArbitrationModeType{
    /**
     * Arbiter runs permanently
     */
    ADCGROUP001_RUNSPERMANENTLY = 0,
    /**
     * Arbiter runs on pending request
     */
    ADCGROUP001_RUNSONREQUEST,
}ADCGROUP001_ArbitrationModeType;

/**
 * This enumerates the EMUX Coding scheme
 */
typedef enum ADCGROUP001_EMUXCodeSchemeType{
    /**
     * Binary coding scheme
     */
    ADCGROUP001_BINARYCODE = 0,
    /**
     * Gray coding scheme
     */
    ADCGROUP001_GRAYCODE,
}ADCGROUP001_EMUXCodeSchemeType;

/**
 * This enumerates the EMUX mode
 */
typedef enum ADCGROUP001_EMUXModeType{
    /**
     * Software Control
     */
    ADCGROUP001_SOFTWARECONTROLMODE = 0,
    /**
     * Steady mode
     */
    ADCGROUP001_STEADYMODE,
    /**
     * Single step mode
     */
    ADCGROUP001_SINGLESTEPMODE,
    /**
     * Sequence mode
     */    
    ADCGROUP001_SEQUENCEMODE
}ADCGROUP001_EMUXModeType;

/**
 * This enumerates the conversion mode
 */
typedef enum ADCGROUP001_ConversionMode{
    /**
     * 12 bit mode
     */
    ADCGROUP001_12BIT = 0,
    /**
     * 10 bit mode
     */
    ADCGROUP001_10BIT=1,
    /**
     * 8 bit mode
     */
    ADCGROUP001_8BIT=2,
    /**
     * 10 bit fast compare mode
     */    
    ADCGROUP001_10BITFAST = 5
}ADCGROUP001_ConversionMode;

/**
 * This enumerates the Analog converter control
 */
typedef enum ADCGROUP001_AnalogConverterControl{
    /**
     * Analog converter OFF
     */
    ADCGROUP001_ANALOG_CONVERTER_OFF = 0,
    /**
     * Analog converter ON
     */    
    ADCGROUP001_ANALOG_CONVERTER_ON = 3 
}ADCGROUP001_AnalogConverterControl;

/**
 * This enumerates the Arbitration round length
 */
typedef enum ADCGROUP001_ArbitraiotnRoundLength{
    /**
     * 4 arbitration slots per round
     */
    ADCGROUP001_4ARBITRATION_SLOTS = 0,
    /**
     * 8 arbitration slots per round
     */
    ADCGROUP001_8ARBITRATION_SLOTS,
    /**
     * 16 arbitration slots per round
     */
    ADCGROUP001_16ARBITRATION_SLOTS,
    /**
     * 20 arbitration slots per round
     */    
    ADCGROUP001_20ARBITRATION_SLOTS 
}ADCGROUP001_ArbitraiotnRoundLength;

/**
 * This structure holds the parameters which change at run time.
 */
typedef struct ADCGROUP001_DynamicDataType
{
/**
 * This enumerates the state of the App.
 */
ADCGROUP001_StateType State;

}ADCGROUP001_DynamicDataType;

/**
 * This structure holds all the static configuration parameters of the Event
 * Counter APP.
 */
typedef struct ADCGROUP001_HandleType
{
  /**
   * This is ADC group number.
   */
  const uint8_t kGroupNo;
  /**
   * This is post calibration enable or disable value
   */
  const uint8_t kPostCalibration;
  /**
   * This is arbitration mode of arbiter.
   */
  const uint8_t kArbitrationMode;
  /**
   * This is group boundary 0.
   */
  const uint16_t kGrpBoundary0;
  /**
   * This is group boundary 1.
   */
  const uint16_t kGrpBoundary1;
  /**
   * This is the EMUX coding scheme value.
   */
  const uint8_t kEMUXCodeScheme;
  /**
   * This is EMUX start select.
   */
  const uint8_t kEMUXStartSelect;
  /**
   * This is EMUX mode.
   */
  const uint8_t kEMUXMode;
  /**
   * This is Analog converter control.
   */
  const uint8_t kAnalogConverterCtrl;
  /**
   * This is the pointer to the structure which holds the parameters which 
   * change at run time.
   */
  ADCGROUP001_DynamicDataType * DynamicHandlePtr;
  
  /**
   * This is the pointer to the VADC Global Registers.
   */
  VADC_GLOBAL_TypeDef* VADCGlobalPtr;
  /**
   * This is the pointer to the VADC group Registers.
   */
  VADC_G_TypeDef* VADCGroupPtr;
  /**
   * This is the value of the conversion mode of class 0.
   */
  const uint8_t kConversionModeClass0;
  /**
   * This is the value of the conversion mode of class 1.
   */
  const uint8_t kConversionModeClass1;
  /**
   * This is the clock cycles required for sample time calculation of class 0.
   */
  const uint8_t kSampleTimeControlClass0;
  /**
   * This is the clock cycles required for sample time calculation of class 1.
   */
  const uint8_t kSampleTimeControlClass1;
  /**
   * This is the value of the EMUX conversion mode of class 0.
   */
  const uint8_t kEMUXConversionModeClass0;
  /**
   * This is the value of the EMUX conversion mode of class 1.
   */
  const uint8_t kEMUXConversionModeClass1;
  /**
   * This is the clock cycles required for sample time calculation of class 0.
   */
  const uint8_t kEMUXSampleTimeControlClass0;
  /**
   * This is the clock cycles required for sample time calculation of class 1.
   */
  const uint8_t kEMUXSampleTimeControlClass1;
}ADCGROUP001_HandleType;


/**
 * @}
 */
/**
 * @ingroup ADCGROUP001_apidoc
 * @{
 */
 
/*******************************************************************************
** FUNCTION PROTOTYPES                                                        **
*******************************************************************************/


/**
 * @brief This function initializes the ADC groups with the configured
 * parameters.
 *
 * @return None <BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 * int main(void)
 * {
 *    DAVE_Init(); //ADCGROUP001_Init is called within DAVE_Init
 *    while(1);
 *    return 0;
 * }
 @endcode
 */
void ADCGROUP001_Init(void);

/**
 * @brief This function will reset the App.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @return <b>status_t</b><BR>
 * DAVEApp_SUCCESS: if the function is successful.<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *    //Call the deinit function to reset the app to default values.
 *    Status = 
 *          ADCGROUP001_Deinit((ADCGROUP001_HandleType*)&ADCGROUP001_Handle0);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_Deinit(const ADCGROUP001_HandleType* HandlePtr);

/**
 * @brief This Function checks the status of calibration.\n
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set group specific boundary 0.
 *    Status =
 *          ADCGROUP001_GetStartupCalStatus(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 *
 */
status_t ADCGROUP001_GetStartupCalStatus(const ADCGROUP001_HandleType *HandlePtr);

/**
 * @brief This function sets the group specific boundary 0.\n
 *        Boundary value should be according to the conversion mode width.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] BoundaryValue Group specific boundary value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the value is above 4096<BR><BR>
 * 
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set group specific boundary 0.
 *    Status =
 *          ADCGROUP001_SetGroupBound0(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1000);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 *
 */
status_t ADCGROUP001_SetGroupBound0(const ADCGROUP001_HandleType *HandlePtr,
                                                       uint16_t BoundaryValue);


/**
 * @brief This function sets the group specific boundary 1.\n
 *        Boundary value should be according to the conversion mode width.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] BoundaryValue Group specific boundary value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the value is above 4096<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set group specific boundary 1.
 *    Status =
 *          ADCGROUP001_SetGroupBound1(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1000);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupBound1(const ADCGROUP001_HandleType *HandlePtr, 
                                                       uint16_t BoundaryValue);

/**
 * @brief This function activates the group specific request node.\n
 *        Several ADC events can issue service requests to CPU.\n
 *        Each event can be assigned to one of eight service request nodes.\n
 *        Each service request can be activated via software by setting the\n
 *        corresponding bit in register GxSRACT (x = 0 - 3).\n
 *        This can be used for evaluation and testing purposes.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] Node Service request node<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the Node value is above Maximum service
 *                           request nodes 4.<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Active group service request node.
 *    Status =
 *          ADCGROUP001_ActiveGroupServiceRequestNode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_ActiveGroupServiceRequestNode(
                         const ADCGROUP001_HandleType *HandlePtr, uint8_t Node);


/**
 * @brief This function Deactivates the group specific request node.
 *        Several ADC events can issue service requests to CPU.\n
 *        Each event can be assigned to one of eight service request nodes.\n
 *        Each service request can be deactivated via software by clearing the\n
 *        corresponding bit in register GxSRACT (x = 0 - 3).\n
 *        This can be used for evaluation and testing purposes.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] Node Service request node<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the Node value is above Maximum service
 *                           request nodes 4.<BR><BR>
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //DeActive group service request node.
 *    Status =
 *          ADCGROUP001_DeActiveGroupServiceRequestNode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode

 */
status_t ADCGROUP001_DeActiveGroupServiceRequestNode(
                         const ADCGROUP001_HandleType *HandlePtr, uint8_t Node);


/**
 * @brief This function activates the shared service request node.\n
 *        Several ADC events can issue service requests to CPU.\n
 *        Each event can be assigned to one of eight service request nodes.\n
 *        Each service request can be activated via software by setting the\n
 *        corresponding bit in register GxSRACT (x = 0 - 3).\n
 *        This can be used for evaluation and testing purposes.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] Node Service request node<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the Node value is above Maximum service
 *                           request nodes 4.<BR><BR>
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //DeActive shared service request node.
 *    Status =
 *          ADCGROUP001_ActiveSharedServiceRequestNode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode

 */
status_t ADCGROUP001_ActiveSharedServiceRequestNode(
                        const ADCGROUP001_HandleType *HandlePtr, uint8_t Node);

/**
 * @brief This function Deactivates the shared service request node.
 *        Several ADC events can issue service requests to CPU.\n
 *        Each event can be assigned to one of eight service request nodes.\n
 *        Each service request can be deactivated via software by clearing the\n
 *        corresponding bit in register GxSRACT (x = 0 - 3).\n
 *        This can be used for evaluation and testing purposes.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] Node Service request node<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the Node value is above Maximum service
 *                           request nodes 4.<BR><BR>
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //DeActive shared service request node.
 *    Status =
 *          ADCGROUP001_DeActiveSharedServiceRequestNode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_DeActiveSharedServiceRequestNode(
                        const ADCGROUP001_HandleType *HandlePtr, uint8_t Node);

/**
 * @brief This function sets the value of EMUX start selection.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] StartSelectionValue EMUX start selection value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the StartSelectionValue value is above  
 *                           maximum channels 8.<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set EMUX start select value.
 *    Status =
 *          ADCGROUP001_EMUXStartSelection(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_EMUXStartSelection(const ADCGROUP001_HandleType *HandlePtr,
                                                  uint8_t StartSelectionValue);

/**
 * @brief This function reads the value of EMUX start selection.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] StartSelectionValuePtr EMUX start selection value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the StartSelectionValue value is above  
 *                         maximum channels 8.<BR><BR>
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    uint8_t StartSelect;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Get EMUX start select value.
 *    Status =
 *          ADCGROUP001_GetEMUXStartSelection(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, &StartSelect);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_GetEMUXStartSelection(
      const ADCGROUP001_HandleType *HandlePtr, uint8_t *StartSelectionValuePtr);


/**
 * @brief This function sets the value of EMUX channel select.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] ChannelSelectValue EMUX channel selection value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the StartSelectionValue value is above  
 *                                   maximum channels 8.<BR><BR>
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set EMUX channel select value.
 *    Status =
 *          ADCGROUP001_SetEMUXChannelSelect(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetEMUXChannelSelect(
          const ADCGROUP001_HandleType *HandlePtr, uint8_t ChannelSelectValue);

/**
 * @brief This function sets the value of EMUX mode.
 * There are 4 modes available: \n
 * Software Control: No EMUX is connected. \n
 * Steady mode: Converts the configured external channel
 *                when the selected channel is encountered. \n
 * Single step mode: Converts one external channel of the configured sequence
 *                     when the selected channel is encountered. \n
 * Sequence mode: Automatically converts all configured external channels
 *                  when the selected channel is encountered. 
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] Mode EMUX mode value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the Mode value is above Sequence mode<BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set EMUX Mode.
 *    Status =
 *          ADCGROUP001_SetEMUXMode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 
 *                                                   ADCGROUP001_SEQUENCEMODE);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetEMUXMode(const ADCGROUP001_HandleType *HandlePtr,
                                                                  uint8_t Mode);

/**
 * @brief This function sets the value of EMUX coding scheme.\n
 * There are two coding schemes: \n
 * Binary Code: 000|001|010|011|100|101|110|111 \n
 * Gray Code  : 000|001|011|010|110|111|101|100
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] CodeScheme EMUX code value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful. <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the CodeScheme value is
 *                           above ADCGROUP001_GRAYCODE<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set EMUX coding scheme.
 *    Status =
 *         ADCGROUP001_SetEMUXCodeScheme(
 *         (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, ADCGROUP001_GRAYCODE);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetEMUXCodeScheme(const ADCGROUP001_HandleType *HandlePtr,
                                                           uint8_t CodeScheme);

/**
 * @brief This function decides use of STCE.\n
 *        Switching the external multiplexer usually requires an additional
 *        settling time for the input signal.\n This function can decide
 *        whether to use the alternate sample time setting STCE each time the
 *        external channel is changed or not.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] ControlValue EMUX sample time control value<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State.
 * ADCGROUP001_INVALID_PARAM_ERROR: if the ControlValue value is above 1<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set sample time control.
 *    Status =
 *          ADCGROUP001_SetEMUXSampleTimeControl(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetEMUXSampleTimeControl(
                 const ADCGROUP001_HandleType *HandlePtr, uint8_t ControlValue);

/**
 * @brief This function sets the sample time for standard conversion mode in 
 *        group input class 0. \n
 *        Sample time is the actual register bit field (STCS) value and it's range is from 0 to 31.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] SampleTime Sample time value for standard conversion<BR> 
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the SampleTime value is above 31<BR><BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set sample time for standard conversion in group input class 0
 *    Status =
 *          ADCGROUP001_SetGroupClass0SampleTime(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 31);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass0SampleTime(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                                            uint8_t SampleTime);

/**
 * @brief This function sets the sample time for standard conversion mode in 
 *        group input class 1. \n
 *         Sample time is the actual register bit field (STCS) value and it's range is from 0 to 31.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] SampleTime Sample time value for standard conversion<BR> 
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the SampleTime value is above 31<BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set sample time for standard conversion in group input class 1
 *    Status =
 *          ADCGROUP001_SetGroupClass1SampleTime(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 31);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass1SampleTime(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                                            uint8_t SampleTime);


/**
 * @brief This function sets the sample time for EMUX conversion mode in 
 *        group input class 0. \n
 *         Sample time is the actual register bit field (STCS) value and it's range is from 0 to 31.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] SampleTime Sample time value for EMUX conversion<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the SampleTime value is above 31<BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set sample time for EMUX conversion in group input class 0
 *    Status =
 *          ADCGROUP001_SetGroupClass0EmuxSampleTime(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 31);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass0EmuxSampleTime(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                        uint8_t SampleTime);


/**
 * @brief This function sets the sample time for EMUX conversion mode in 
 *        group input class 1. \n
 *         Sample time is the actual register bit field (STCS) value and it's range is from 0 to 31.
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] SampleTime Sample time value for EMUX conversion<BR>
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State. <BR>
 * ADCGROUP001_INVALID_PARAM_ERROR: if the SampleTime value is above 31<BR>
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set sample time for EMUX conversion in group input class 1.
 *    Status =
 *          ADCGROUP001_SetGroupClass1EmuxSampleTime(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 31);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass1EmuxSampleTime(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                        uint8_t SampleTime);


/**
 * @brief This function sets the standard conversion mode in group input class 0.\n
 * There are four standard conversion mode: \n
 * 12 Bit mode \n
 * 10 Bit mode \n
 * 8 Bit mode \n
 * 10 Bit fast compare mode
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] ConversionModeVal Standard conversion mode<BR> 
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State.
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set conversion mode for standard conversion in group input class 0.
 *    Status =
 *          ADCGROUP001_SetGroupClass0ConvMode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass0ConvMode(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                        uint8_t ConversionModeVal);
                                        
                                        
/**
 * @brief This function sets the standard conversion mode in group input class 1.\n
 * There are four standard conversion mode: \n
 * 12 Bit mode \n
 * 10 Bit mode \n
 * 8 Bit mode \n
 * 10 Bit fast compare mode
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] ConversionModeVal Standard conversion mode<BR> 
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State.
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set conversion mode for standard conversion in group input class 1.
 *    Status =
 *          ADCGROUP001_SetGroupClass1ConvMode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */

status_t ADCGROUP001_SetGroupClass1ConvMode(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                        uint8_t ConversionModeVal);

/**
 * @brief This function sets the emux conversion mode in group input class 0.\n
 * There are four emux conversion mode: \n
 * 12 Bit mode \n
 * 10 Bit mode \n
 * 8 Bit mode \n
 * 10 Bit fast compare mode
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] ConversionModeVal EMUX conversion mode<BR> 
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State.
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set conversion mode for emux conversion in group input class 0.
 *    Status =
 *          ADCGROUP001_SetGroupClass0EmuxConvMode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass0EmuxConvMode(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                        uint8_t ConversionModeVal
                                          );

/**
 * @brief This function sets the emux conversion mode in group input class 1.\n
 * There are four emux conversion mode: \n
 * 12 Bit mode \n
 * 10 Bit mode \n
 * 8 Bit mode \n
 * 10 Bit fast compare mode
 * @param[in] HandlePtr pointer to the Instance variable<BR>
 * @param[in] ConversionModeVal EMUX conversion mode<BR> 
 * @return <b>status_t</b><BR>
 *
 * DAVEApp_SUCCESS: if the function is successful <BR>
 * ADCGROUP001_OPER_NOT_ALLOWED: If the function is called when in
 * ADCGROUP001_UNINITIALIZED State.
 *
 * <b>Reentrant: yes</b><BR>
 * <b>Sync/Async:  Synchronous</b>
 *
 * @code
 * #include <DAVE3.h>
 *
 * int main(void)
 * {
 *    status_t Status;
 *    DAVE_Init();//ADCGROUP001_Init is called within DAVE_Init
 *
 *    //Set conversion mode for emux conversion in group input class 1.
 *    Status =
 *          ADCGROUP001_SetGroupClass1EmuxConvMode(
 *            (ADCGROUP001_HandleType*)&ADCGROUP001_Handle0, 1);
 *    while(1);
 *    return 0;
 * }
 * @endcode
 */
status_t ADCGROUP001_SetGroupClass1EmuxConvMode(
                                        const ADCGROUP001_HandleType *HandlePtr, 
                                        uint8_t ConversionModeVal
                                          );

#include "ADCGroup001_Conf.h"
/**
 * @}
 */

#ifdef __cplusplus
}
#endif
  
#endif /* ADCGROUP001_H_ */
