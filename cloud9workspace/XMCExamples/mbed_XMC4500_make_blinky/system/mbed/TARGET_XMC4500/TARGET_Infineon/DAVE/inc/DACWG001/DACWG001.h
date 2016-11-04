/*******************************************************************************
**                                                                            **
** Copyright (C) Infineon Technologies (2014)                                 **
**                                                                            **
** All rights reserved.                                                       **
**                                                                            **
** This document contains proprietary information belonging to Infineon       **
** Technologies. Passing on and copying of this document, and communication   **
** of its contents is not permitted without prior written authorization.      **
**                                                                            **
********************************************************************************
**                                                                            **
**                                                                            **
** PLATFORM : Infineon <Microcontroller name, step>                           **
**                                                                            **
** COMPILER : Compiler Independent                                            **
**                                                                            **
** AUTHOR : App Developer                                                     **
**                                                                            **
** MAY BE CHANGED BY USER [yes/no]: Yes                                       **
**                                                                            **
** MODIFICATION DATE : Jan 20, 2014                                           **
**                                                                            **
*******************************************************************************/

/*******************************************************************************
**                       Author(s) Identity                                   **
********************************************************************************
**                                                                            **
** Initials     Name                                                          **
** ---------------------------------------------------------------------------**
** SS           App Developer                                                 **
*******************************************************************************/

/**
 * @file  DACWG001.h
 *
 * @brief This file contains all public data structures,enums and function
 *        prototypes for Auto Wave Generator.
 *
 */

#ifndef DACWG001_H_
#define DACWG001_H_

#ifdef __cplusplus
extern "C" {
#endif

/*******************************************************************************
**                      Include Files                                         **
*******************************************************************************/
#include "DAVE3.h"

/*******************************************************************************
**                      Global Macro Definitions                              **
*******************************************************************************/
/**
 * @ingroup DACWG001_publicparam
 * @{
 */


/*<<<DD_AUTOWAVEGEN_MACRO_1>>>*/
/**
 * For Selecting the Pattern generation mode.
 */
#define DACWG001_PATGEN_MODE 0X03U

/*<<<DD_AUTOWAVEGEN_MACRO_2>>>*/
/**
 * For Enabling the Register Bits.
 */
#define DACWG001_ENABLE 0X01U

/*<<<DD_AUTOWAVEGEN_MACRO_3>>>*/
/**
 * For Disabling the bits
 */
#define DACWG001_DISABLE (uint32_t)0X00

/*<<<DD_AUTOWAVEGEN_MACRO_4>>>*/
/**
 * For Selecting the Noise mode
 */
#define DACWG001_NOISE_MODE 0x04U
/**
 * For Selecting the Noise mode
 */
#define DACWG001_SINGLE_VALUE_MODE 0x01U

/*<<<DD_AUTOWAVEGEN_MACRO_5>>>*/
/**
 * For Selecting the Ramp  mode
 */
#define DACWG001_RAMP_MODE 0x05U

/*<<<DD_AUTOWAVEGEN_MACRO_7>>>*/
/**
 * Greatest Frequency Value
 */
#define DACWG001_FREQUENCY_VALID_RANGE 0XFFFFFU

/*<<<DD_AUTOWAVEGEN_MACRO_8>>>*/
/**
 * Greatest Offset Value
 */
#define DACWG001_OFFSET_VALID_RANGE 0XFFU

/*<<<DD_AUTOWAVEGEN_MACRO_9>>>*/
/**
 * Greatest Scale Value
 */
#define DACWG001_SCALE_VALID_RANGE 0X07U

/*<<<DD_AUTOWAVEGEN_MACRO_10>>>*/
/**
 * Group Id for the module
 */
#define DACWG001_GID_DACWG001 0X07U
/*******************************************************************************
 *                                ENUMERATIONS                                **
 ******************************************************************************/

/**
 * This enumerates the states of the Auto Wave Generator APP.
 */
typedef enum DACWG001_StateType{
  /**
   * This is the default state after power on reset
   */
  DACWG001_UNINITIALIZED,
  /**
   * This is the INITIALIZED state in which APP is initialized as per selected
   * parameters.
  */
  DACWG001_INITIALIZED,
 /**
  * This state indicates that Auto Wave Generator is running.
  */
  DACWG001_RUNNING,
 /**
  * This state indicates that CCU4_CCy slice timer is stopped.
  */
}
DACWG001_StateType;

/**
 * This enumerates lists all the waveform Types.
 */
typedef enum DACWG001_WaveType
{
  /**
   * For Sinusoidal waveform.
   */
  SINE_WAVE,
  /**
   * For Triangular waveform
   */
  TRIANGULAR_WAVE,
  /**
   * For Rectangular waveform
   */
  RECTANGULAR_WAVE,
  /**
   * For Ramp waveform
   */
  RAMP_WAVE,
  /**
   * For Noise wave
   */
  NOISE_WAVE,
  /**
   * For User defined waveform
   */
  USERDEFINED_WAVE,
  /**
   * Single voltage value
   */
  SINGLE_VOLTAGE_VALUE
}
DACWG001_WaveType;

/**
 * This enumerates the error codes of the Auto Wave Generator APP which is a
 * return parameter of function.
 */
typedef enum DACWG001_AutoWaveError{

 /**
  * This error code would be returned if the current API operation is not
  * possible because the App is in certain state. E.g DACWG001_RUNNING
  * API can be called only when the App instance is in
  * DACWG001_INITIALISED State.
  */
  /**
   * @cond INTERNAL_DOCS
   * @param MODULENAME DACWG001
   * @endcond
   */
  /**
  * @cond INTERNAL_DOCS
  * @param ERRCODESTRING1 DACWG001_OPER_NOT_ALLOWED
  * @param STRCODESTRING1 The Operation is not allowed in current state.
  * @endcond
  */
  DACWG001_OPER_NOT_ALLOWED = 1,
 /**
  * This error code means that the parameters passed to an API are invalid
  */
  /**
  * @cond INTERNAL_DOCS
  * @param ERRCODESTRING2 DACWG001_INVALID_PARAM
  * @param STRCODESTRING2 Invalid parameter is passed
  * @endcond
  */
  DACWG001_INVALID_PARAM,
 /* Debug Log Codes starts here*/
 /**
  * DebugLog Message Id for Function Entry
 */
  /**
  * @cond INTERNAL_DOCS
  * @param ERRCODESTRING3 DACWG001_FUNCTION_ENTRY
  * @param STRCODESTRING3 Entered function \%s
  * @endcond
  */
  DACWG001_FUNCTION_ENTRY,
 /**
  * DebugLog Message Id for Function Exit
  */
  /**
  * @cond INTERNAL_DOCS
  * @param ERRCODESTRING4 DACWG001_FUNCTION_EXIT
  * @param STRCODESTRING4 Exited function \%s
  * @endcond
  */
  DACWG001_FUNCTION_EXIT
}
DACWG001_AutoWaveError;

/*******************************************************************************
 *                             STRUCTURES                                     **
 ******************************************************************************/

/**
 * This union is for specifying the offset. Offset is an unsigned quantity for
 * all the waveforms except for Ramp waveform
 */
typedef union DACWG001_OffsetType
{
  uint8_t UnsignedOffset;
  int8_t  SignedOffset;
}
DACWG001_OffsetType;
/**
 * This structure will hold the parameters which is used to configure the wave
 * parameters atchange at runtime.
 */
typedef struct DACWG001_ConfigType{
  /**
   * This parameter is used for the Offset value of waveform
   */
  DACWG001_OffsetType Offset;
  /**
   * This parameter is used for the Scaling value of waveform
   */
  uint8_t Scale;
  /**
   * This parameter is used for setting the MulDiv bit
   */
  uint8_t MulDivBit;
  /**
   * This parameter is used for the frequency of waveform
   */
  uint32_t Frequency;

}DACWG001_Config;
/**
 * This structure will contains the dynamic data of App which change at run
 * time.
 */
typedef struct DACWG001_DynamicDataType{

  /**
   * This Structure holds the current Configuration of the App
   */
  DACWG001_Config Config;
  /**
   * In case of Ramp mode this variable stores the Ramp Start value
   */
  uint16_t RampStart;
  /**
   * In case of Ramp mode this variable stores the Ramp End value
   */
  uint16_t RampEnd;

  /**
  * This parameter tells state of the API
  */
  DACWG001_StateType StateType;

}DACWG001_DynamicDataType;

/**
 * This structure holds all the static configuration parameters for the Auto
 * Wave Generator APP.
 */
typedef struct DACWG001_HandleType{
 /**
  * This will have the current DAC channel assigned by Resourse manager.
  */
  uint8_t kDACChannelInUse;
 /**
  * This is use to inform about the Triggering Source either internal or External.
  */
  uint8_t kExternalTrigger;

 /**
  * This parameter is use to configuer the MulDiv bit.
  */
  uint8_t kMulDivBit;
  /**
  * This parameter saves the Scaling Value of the Wave.
  */
  uint8_t kScale;

 /**
  * This is the offset value of the Wave.
  */
  DACWG001_OffsetType kOffset;

  /**
  * This is start after init.
  */
  uint8_t kStartAfterInit;

  /**
  * This parameter gives the Start value for the Ramp Wave.
  */
  uint16_t kRampStartVal;

  /**
  * This parameter gives the End value for the Ramp Wave.
  */
  uint16_t kRampEndVal;
  /**
   * The single voltage in Hex
   */
  uint16_t SingleVoltage;

  /**
   * This is the Frequency divider value depending on the Frequency Selected.
   */
  uint32_t kFrequencyDivider;

  /**
   * This is the Frequency value given by the user.
   */
  uint32_t kFrequency;

 /**
  * This parameter is used to store for the higher pattern register value
  */
  uint32_t kPATH;

 /**
  * This parameter is used to store for the Lower pattern register value
  */
  uint32_t kPATL;

  DACWG001_WaveType WaveType;

  DACWG001_DynamicDataType *DynamicDataPtr;

  DAC_GLOBAL_TypeDef* DACRegsPtr;

}DACWG001_HandleType;

/**
 * @}
 */

/**
 * @ingroup DACWG001_apidoc
 * @{
 */
/*******************************************************************************
 **FUNCTION PROTOTYPES                                                        **
*******************************************************************************/

/**
 * @brief This function will initialize App as per the GUI configurations. This
 * function initializes all the instance of the App.
 * @return void
 *
 * @code
  #include <DAVE3.h>

  int main(void)
  {
     //The DACWG001_Init is called within the DAVE_Init();
     DAVE_Init();
     return 0;
   }
 * @endcode
 */
void DACWG001_Init(void);

/**
 * @brief This function will reset DAC registers with default values. This will
 * deinitialises all the instances of the App.
 * @return void
 * @code
 #include <DAVE3.h>
 int main(void)
 {
 // The DACWG001_Init is called within the DAVE_Init();
   DAVE_Init();
   DACWG001_Deinit();
   return 0;
 }

 * @endcode
 */
void DACWG001_Deinit(void);

/**
 * @brief This function will start the Auto Wave Generator APP which will in turn
 * start the waveform generation.
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called when not in the
 * state DACWG001_INITIALIZED.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  //call this function if the start after init is not checked in UI.
  Status = DACWG001_Start(&DACWG001_Handle0);
  if(Status != DAVEApp_SUCCESS)
  {
    //start failed do something here
  }
  return 0;
 }

 * @endcode
 */
status_t DACWG001_Start(const DACWG001_HandleType* HandlePtr);

/**
 * @brief This function will stop the Auto Wave Generator APP which will stop
 * the waveform generation.
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called when not in the
 * state DACWG001_RUNNING.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_Stop(&DACWG001_Handle0);
  if(Status != DAVEApp_SUCCESS)
  {
    //stop failed do something here
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_Stop(const DACWG001_HandleType* HandlePtr);

/**
 * @brief This function will update the Scale value of the output waveform.
 * @param[in] HandlePtr Pointer to DACWG001_HandleType structure.
 * @param[in] Scale The scale value.
 * @param[in] MulDivBit The scale is to be multiplied or divided. value of 1
 * means multiply else divide.
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state.<BR>
 * DACWG001_INVALID_PARAM if some invalid value of scale is given.
 * valid range 0<=Scale<=7.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   uint8_t Scale;
   uint8_t Muldiv;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetScale(&DACWG001_Handle0,3,1);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new scale value failed do something

  }
  else
  {
    // read the scale value
    Status = DACWG001_GetScale(&DACWG001_Handle0,&Scale,&Muldiv);
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetScale
(
  const DACWG001_HandleType* HandlePtr,
  const uint8_t Scale,
  const uint8_t MulDivBit
);

/**
 * @brief This function will set the frequency of the waveform.
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @param[in]   Frequency
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state.<BR>
 * DACWG001_INVALID_PARAM if some invalid value of frequency is given.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   uint32_t Frequency;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetFrequency(&DACWG001_Handle0,2000);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new frequency value failed do something

  }
  else
  {
    // read the frequency value
    Status = DACWG001_GetFrequency(&DACWG001_Handle0,&Frequency);
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetFrequency
(
  const DACWG001_HandleType* HandlePtr,
  const uint32_t Frequency
);

/**
 * @brief This function will update the Offset value.
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @param[in]   Offset
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state<BR>
 * DACWG001_INVALID_PARAM If invalid value of Offset is given.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   DACWG001_OffsetType Offset;
   DACWG001_OffsetType ReadOffset;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Offset.UnsigedOffset = 10;
  Status = DACWG001_SetOffset(&DACWG001_Handle0,Offset);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new Offset value failed do something

  }
  else
  {
    // read the Offset value
    Status = DACWG001_GetOffset(&DACWG001_Handle0,&ReadOffset);
  }


  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetOffset
(
  const DACWG001_HandleType* HandlePtr,
  const DACWG001_OffsetType Offset
);

/**
 * @brief This function will read the current value of Scale.
 *
 * @param[in]  HandlePtr Pointer to DACWG001_HandleType structure
 * @param[out] ScalePtr The scale value.
 * @param[out] MulDivBitPtr The scale is multiplied or divided. 0 = divide and 1 =
 * multiply.
 *
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   uint8_t Scale;
   uint8_t Muldiv;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetScale(&DACWG001_Handle0,3,1);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new scale value failed do something

  }
  else
  {
    // read the scale value
    Status = DACWG001_GetScale(&DACWG001_Handle0,&Scale,&Muldiv);
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_GetScale
(
  const DACWG001_HandleType* HandlePtr,
    uint8_t* ScalePtr ,
    uint8_t* MulDivBitPtr
);

/**
 * @brief This function will read the current Frequency value.
 * @param[out]  FrequencyPtr
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   uint32_t Frequency;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetFrequency(&DACWG001_Handle0,2000);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new frequency value failed do something

  }
  else
  {
    // read the frequency value
    Status = DACWG001_GetFrequency(&DACWG001_Handle0,&Frequency);
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_GetFrequency
(
  const DACWG001_HandleType* HandlePtr,
  uint32_t* FrequencyPtr
);

/**
 * @brief This function will read the current Offset value.
 * @param[out]  OffsetPtr
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   DACWG001_OffsetType Offset;
   DACWG001_OffsetType ReadOffset;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Offset.UnsigedOffset = 10;
  Status = DACWG001_SetOffset(&DACWG001_Handle0,Offset);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new Offset value failed do something

  }
  else
  {
    // read the Offset value
    Status = DACWG001_GetOffset(&DACWG001_Handle0,&ReadOffset);
  }


  return 0;
 }

 * @endcode
 */
status_t DACWG001_GetOffset
(
  const DACWG001_HandleType* HandlePtr,
  DACWG001_OffsetType* OffsetPtr
);

/**
 * @brief This function will read the current values of the waveform.
 *       parameters of a particular APP instance.
 * @param[out]  ConfigPtr Pointer to DACWG001_ConfigType structure
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   DACWG001_Config Config;
   DACWG001_Config ReadConfig;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Config.Frequency = 2000;
  Config.MulDivBit = 1;
  Config.Scale = 2;
  Config.Offset = 20;

  Status = DACWG001_SetConfig(&DACWG001_Handle0,&Config);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new config failed do something

  }
  else
  {
    // read the Current Config
    Status = DACWG001_GetConfig(&DACWG001_Handle0,&ReadConfig);
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_GetConfig
(
  const DACWG001_HandleType* HandlePtr,
    DACWG001_Config* ConfigPtr
);

/**
 * @brief This function is used to configure the waveform parameters.
 * @param[in]   ConfigPtr Pointer to DACWG001_ConfigType structure
 * @param[in]   HandlePtr Pointer to DACWG001_HandleType structure
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state<BR>
 * DACWG001_INVALID_PARAM If some invalid value is given.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   DACWG001_Config Config;
   DACWG001_Config ReadConfig;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Config.Frequency = 2000;
  Config.MulDivBit = 1;
  Config.Scale = 2;
  Config.Offset = 20;

  Status = DACWG001_SetConfig(&DACWG001_Handle0,&Config);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new config failed do something

  }
  else
  {
    // read the Current Config
    Status = DACWG001_GetConfig(&DACWG001_Handle0,&ReadConfig);
  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetConfig
(
  const DACWG001_HandleType* HandlePtr,
  const DACWG001_Config* ConfigPtr
);

/**
 * @brief This API is used to program the Single value voltage.
 *
 * @param[in]   HandlePtr Pointer to DACWG001 instance
 * @param[in]   Reference This value would be programmed as Single Value. This is
 * 12 bit Hex number.
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state. Also if the waveform mode is not RAMP mode.<BR>
 * DACWG001_INVALID_PARAM If the reference value is greater than 12 bit number.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetSingleValue(&DACWG001_Handle0,1200);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of new reference failed

  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetSingleValue
(
  const DACWG001_HandleType* HandlePtr,
  uint16_t Reference
);

/**
 * @brief This function is used to program the Ramp start value in Ramp Mode. Please
 * note that since Ramp Start and Ramp End are seperate functions, the start and
 * end values are programmed with a delay. This might cause a glitch in the output
 * for short duration.
 *
 * @param[in]   HandlePtr Pointer to DACWG001 instance
 * @param[in]   RampStart This value would be programmed as RAMP Start.
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state. Also if the waveform mode is not RAMP mode.<BR>
 * DACWG001_INVALID_PARAM If the RampStart value is greater than 12 bit number.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetRampStart(&DACWG001_Handle0,150);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of Ramp Start Failed

  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetRampStart
(
  const DACWG001_HandleType* HandlePtr,
  uint16_t RampStart
);

/**
 * @brief This function is used to program the Ramp end value in Ramp Mode. Please
 * note that since Ramp Start and Ramp End are seperate functions, the start and
 * end values are programmed with a delay. This might cause a glitch in the output
 * for short duration.
 * @param[in]   HandlePtr Pointer to DACWG001 instance
 * @param[in]   RampEnd This value would be programmed as RAMP End.
 * @return status_t<BR>
 * DAVEApp_SUCCESS: If function is successful.<BR>
 * DACWG001_OPER_NOT_ALLOWED: If this function is called from
 * DACWG001_UNINITIALISED state. Also if the waveform mode is not RAMP mode.<BR>
 * DACWG001_INVALID_PARAM If the RampEnd value is greater than 12 bit number.<BR>
 * @code
 #include <DAVE3.h>
 int main(void)
 {
   status_t Status;
   // The DACWG001_Init is called within the DAVE_Init();
  DAVE_Init();
  Status = DACWG001_SetRampEnd(&DACWG001_Handle0,150);
  if(Status != DAVEApp_SUCCESS)
  {
    //setting of Ramp End Failed

  }
  return 0;
 }
 * @endcode
 */
status_t DACWG001_SetRampEnd
(
  const DACWG001_HandleType* HandlePtr,
  uint16_t RampEnd
);

/**
 * @}
 */

#include "DACWG001_Conf.h"

#ifdef __cplusplus
}
#endif


#endif /* DACWG001_H_ */
