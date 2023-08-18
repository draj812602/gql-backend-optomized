/* eslint-disable camelcase */
const { pool } = require('../utils/db_connection')
const { PubSub } = require('apollo-server-express')
const { getDateTimeBasedOnCounty } = require('../utils/getDateTimezoneData')
const { getDeviceCountryCode } = require('../utils/getDeviceCountryCode')
const { dateForDisplay } = require('../utils/dateForDisplay')
//  { dateFormatForSensorPower } = require('../utils/dateFormatForSensorPower')

const pubsub = new PubSub()
const eventSubscriber = async (messages) => {
  const messageSource = JSON.stringify(messages.systemProperties['iothub-message-source'])
  let device_Id = JSON.stringify(messages.systemProperties['iothub-connection-device-id'])
  device_Id = device_Id.replace(/"/g, '')
  const deviceId = addColonToMAC(device_Id).join(':')
  /** Fetch device country code from user device info table */
  const country_code = await getDeviceCountryCode(pool, deviceId)
  /** */
  console.log('deviceId', deviceId)
  // if (deviceId === '00:08:dc:59:81:66') {
  if (messageSource === '"Telemetry"') {
    const telemetry = (messages.body)
    console.log('telemetry', (messages.body))
    const epoch_time = messages.systemProperties['iothub-enqueuedtime']
    console.log(epoch_time)
    // const recorded_at = epochToFullDateTime(epoch_time)
    /** Save epoch time in the form of timestamp */
    const data_recorded_at = new Date(epoch_time)
    console.log('data_recorded_at=', data_recorded_at)
    /** */
    /** Convert universal time into respective timezone datetime */
    const dataRecordedTimeForUI = (await getDateTimeBasedOnCounty(pool, country_code, data_recorded_at)).formattedDate
    console.log('data_recorded_at_UI=', dataRecordedTimeForUI)
    /** */
    let comp_name, component_value
    for (const key in telemetry) {
      comp_name = key
      component_value = telemetry[key]
      console.log(comp_name, component_value)
      const obj = await getDevComponetInfo(deviceId, comp_name)
      const user_dev_id = obj.user_dev_id
      const data_type = obj.data_type
      const user_email = obj.user_email
      const data_time_interval = obj.data_time_interval
      obj.deviceId = deviceId
      obj.comp_name = comp_name
      obj.component_value = component_value
      obj.dataRecordedTimeForUI = dataRecordedTimeForUI

      // SensorPower widget data
      if (data_type === 'String' || data_type === 'Boolean') {
        let updatedRes
        if (data_type === 'String') {
          const qstr1 = {
            text: 'update tbl_user_device_components set string_init_val=$1,in_out=$2,updated_at=$3 where user_dev_id=$4 and component_name=$5 RETURNING user_dev_comp_id, user_dev_id, data_type, component_name, in_out, updated_at,string_init_val',
            values: [component_value, 'D2C', dataRecordedTimeForUI, user_dev_id, comp_name]
          }
          console.log(qstr1)
          updatedRes = await pool.query(qstr1)
        } else if (data_type === 'Boolean') {
          // eslint-disable-next-line semi
          // eslint-disable-next-line no-unneeded-ternary
          component_value = (component_value === 'true') ? true : false
          const qstr2 = {
            text: 'update tbl_user_device_components set bool_init_val=$1,in_out=$2,updated_at=$3 where user_dev_id=$4 and component_name=$5 RETURNING user_dev_comp_id, user_dev_id, data_type, component_name, in_out, updated_at,bool_init_val',
            values: [component_value, 'D2C', dataRecordedTimeForUI, user_dev_id, comp_name]
          }
          console.log(qstr2)
          updatedRes = await pool.query(qstr2)
        }
        if (updatedRes.rowCount === 1) {
          // console.log('updatedRes.rows[0]=', updatedRes.rows[0].data_type)
          await publishD2CMessageData(updatedRes.rows[0], user_email)
        }
      } else if (data_type === 'Float' || data_type === 'Decimal') { // Chart widget data
        // let recorded_date_time = new Date().toLocaleString({ timeZone: "Asia/Calcutta" });
        const singleCompObj = `{"${comp_name}":"${component_value}"}`
        //  console.log(singleCompObj)
        const query1 = {
          text: 'insert into tbl_sensor_data(device_id,recorded_at,data) values($1,$2,$3)',
          values: [deviceId, dataRecordedTimeForUI, singleCompObj]
        }
        // const insertRes = await pool.query(query1)
        await pool.query(query1)
        console.log('qstr=', JSON.stringify(query1))
        if (data_time_interval === 'live') {
          await publishSensorData(obj)
        }
      }
    }
  }
  // }
}

const addColonToMAC = (macWithoutColon) => {
  const addedColonMAC = []
  for (let i = 0, len = macWithoutColon.length; i < len - 1; i += 2) {
    addedColonMAC.push(macWithoutColon.substr(i, 2))
    // console.log(addedColonMAC);
  }
  return addedColonMAC
}

/* const epochToFullDateTime = (epochValue) => {
  const dateObject = new Date(epochValue)
  // console.log('dateObject-epoch', dateObject)
  const timeStamp = dateObject.toLocaleTimeString({ timeZone: 'Asia/Calcutta' }, {
    hour: '2-digit',
    minute: '2-digit'
  })
  // console.log('dateObject', timeStamp)
  const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(dateObject)
  const mo = new Intl.DateTimeFormat('en', { month: 'numeric' }).format(dateObject)
  const da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(dateObject)

  const fullDateTime = `${da}/${mo}/${ye} ${timeStamp}`
  return fullDateTime
} */

const getDevComponetInfo = async (deviceId, comp_name) => {
  try {
    const macc_addres = deviceId
    console.log('macc_addres=', macc_addres)
    const qstr1 = {
      text: 'select user_dev_id,user_id from tbl_user_device_info where mac_address=$1',
      values: [macc_addres]
    }
    const { user_dev_id, user_id } = (await pool.query(qstr1)).rows[0]
    const qstr2 = {
      text: 'select data_type,user_dev_comp_id from tbl_user_device_components where user_dev_id=$1 and component_name=$2',
      values: [user_dev_id, comp_name]
    }
    const { data_type, user_dev_comp_id } = (await pool.query(qstr2)).rows[0]
    const qstr4 = {
      text: ' select widget_id,data_time_interval,rule_id,component_id from tbl_dashboard_widget where component_id = $1 and device_id = $2 ',
      values: [user_dev_comp_id, user_dev_id]
    }
    const rr = (await pool.query(qstr4)).rows
    console.log(rr)
    let data_time_interval
    const widget_id = []
    const rule_id = []
    if (rr.length > 0) {
      for (const r of rr) {
        if (r.data_time_interval === 'live') {
          data_time_interval = r.data_time_interval
          widget_id.push(r.widget_id)
          rule_id.push(r.rule_id)
        }
      }
    }
    const qstr3 = {
      text: 'select email from tbl_user_info where user_id=$1',
      values: [user_id]
    }
    const { email } = (await pool.query(qstr3)).rows[0]
    const obj = {
      user_dev_id: user_dev_id,
      user_dev_comp_id: user_dev_comp_id,
      data_type: data_type,
      user_email: email,
      data_time_interval: data_time_interval,
      widget_id: widget_id,
      rule_id: rule_id
    }
    console.log(JSON.stringify(obj))
    return obj
  } catch (err) {
    console.log(err)
    return err
  }
}

const publishSensorData = async (obj) => {
  const device_id = obj.deviceId
  const datasetName = obj.comp_name
  const sensor_value = obj.component_value
  const recorded_at = obj.dataRecordedTimeForUI
  const user_email = obj.user_email
  const widget_id = obj.widget_id
  const data_time_interval = obj.data_time_interval
  const rule_id = obj.rule_id
  const user_dev_comp_id = obj.user_dev_comp_id
  const sensorValueArray = []
  let sensorData = []
  // const qstr1 = {
  //   text: 'select user_dev_id from tbl_user_device_info where mac_address=$1',
  //   values: [device_id]
  // }
  // const user_dev_id = (await pool.query(qstr1)).rows[0].user_dev_id
  // const qstr2 = {
  //   text: 'select user_dev_comp_id from tbl_user_device_components where user_dev_id=$1 and component_name=$2',
  //   values: [user_dev_id, datasetName]
  // }
  // const user_dev_comp_id = (await pool.query(qstr2)).rows[0].user_dev_comp_id
  // const qstr3 = {
  //   text: 'select id from tbl_rule_engine where device_id=$1 and component_id=$2',
  //   values: [user_dev_id, user_dev_comp_id]
  // }
  // const compRules = await pool.query(qstr3)
  // if (compRules.rows.length > 0) {
  //   const ruleEngineid = compRules.rows[0].id
  //   const qstr4 = {
  //     text: 'select id from tbl_rule_engine_rules where dev_rule_id=$1',
  //     values: [ruleEngineid]
  //   }
  //   const ruleEngineRules = await pool.query(qstr4)
  //   if (ruleEngineRules.rows.length > 0) {
  //     for (const rule of ruleEngineRules.rows) {
  //       const sensorValues = {}
  //       const ruleId = rule.id
  //       sensorData = await applyRuleToSensorData(sensor_value, ruleId, recorded_at) // await getSensorData.getInitialWidgetData(null, args, { pool });
  //       sensorValues.device_id = device_id
  //       sensorValues.widget_id = widget_id
  //       sensorValues.sensorName = datasetName
  //       sensorValues.component_id = user_dev_comp_id
  //       sensorValues.rule_id = ruleId
  //       sensorValues.data_time_interval = data_time_interval
  //       sensorValues.data = sensorData
  //       sensorValueArray.push(sensorValues)
  //     }
  // console.log('published-1')
  if (rule_id.length > 0) {
    for (let i = 0; i < rule_id.length; i++) {
      const sensorValues = {}
      const ruleId = rule_id[i]
      sensorData = await applyRuleToSensorData(sensor_value, ruleId, recorded_at) // await getSensorData.getInitialWidgetData(null, args, { pool });
      sensorValues.device_id = device_id
      sensorValues.widget_id = widget_id[i]
      sensorValues.sensorName = datasetName
      sensorValues.component_id = user_dev_comp_id
      sensorValues.rule_id = ruleId
      sensorValues.data_time_interval = data_time_interval
      sensorValues.data = sensorData
      sensorValueArray.push(sensorValues)
    }
    pubsub.publish(`"sensordata/${user_email}"`, { sensordata: sensorValueArray })
    // pubsub.publish(`"sensordata/${widget_id}"`, { sensordata: sensorValueArray })
    // pubsub.publish('sensordata', { sensordata: sensorValueArray })
  } else {
    const sensorValues = {}
    const ruleId = null
    sensorData = await applyRuleToSensorData(sensor_value, ruleId, recorded_at) // await getSensorData.getInitialWidgetData(null, args, { pool });
    sensorValues.device_id = device_id
    sensorValues.sensorName = datasetName
    sensorValues.component_id = user_dev_comp_id
    sensorValues.data_time_interval = data_time_interval
    sensorValues.data = sensorData
    sensorValueArray.push(sensorValues)
    // console.log('no rules published-2')
    pubsub.publish(`"sensordata/${user_email}"`, { sensordata: sensorValueArray })
    // pubsub.publish(`"sensordata/${user_email}"`, { sensordata: sensorValueArray })
    // pubsub.publish('sensordata', { sensordata: sensorValueArray })
  }
}

const publishD2CMessageData = async (updatedRes, user_email) => {
  let initval
  let d2ccompinfo = {
    data_type: '',
    component_id: '',
    component_name: '',
    init_value: '',
    in_out: '',
    updated_at: ''
  }
  console.log(updatedRes.updated_at)
  const updated_at = await dateForDisplay(updatedRes.updated_at)
  const data_type = updatedRes.data_type
  if (data_type === 'String') {
    initval = updatedRes.string_init_val
  } else if (data_type === 'Boolean') {
    initval = updatedRes.bool_init_val
  }
  d2ccompinfo = {
    data_type: data_type,
    component_id: updatedRes.user_dev_comp_id,
    component_name: updatedRes.component_name,
    init_value: initval,
    in_out: updatedRes.in_out,
    updated_at: updated_at
  }

  // console.log(d2ccompinfo)
  pubsub.publish(`"d2cMessage/${user_email}"`, { d2cMessage: d2ccompinfo })
  // pubsub.publish('d2cMessage', { d2cMessage: d2ccompinfo })
}

const applyRuleToSensorData = async (sensor_value, ruleId, recorded_at) => {
  console.log('recorded_at', recorded_at)
  recorded_at = await dateForDisplay(recorded_at)
  sensor_value = parseFloat(sensor_value)
  let sensorDataObject = {
    sensorValue: '',
    sensorValueAddedTime: '',
    color_code: '',
    condition: ''
  }
  const sensorValues = []
  if (ruleId == null) {
    sensorDataObject = {
      sensorValue: sensor_value,
      sensorValueAddedTime: recorded_at,
      color_code: '',
      condition: ''
    }
    sensorValues.push(sensorDataObject)
    return sensorValues
  } else {
    const qstr1 = {
      text: 'select id,name,color,condition_flag from tbl_rule_engine_conditions where rule_id=$1',
      values: [ruleId]
    }
    const ruleConditionRes = await pool.query(qstr1)
    let conditionName = null; let colorcode = null
    if (ruleConditionRes.rows.length > 0) {
      for (const rulecondition of ruleConditionRes.rows) {
        // ruleConditionRes.rows.map(async(data)=>{
        const flag = rulecondition.condition_flag
        const condition_id = rulecondition.id

        if (flag === 1) {
          const qstr2 = {
            text: 'select min,max from tbl_rule_engine_range where condition_id=$1',
            values: [condition_id]
          }
          let { min, max } = (await pool.query(qstr2)).rows[0]
          min = parseFloat(min)
          max = parseFloat(max)
          if (sensor_value >= min && sensor_value <= max) {
            colorcode = rulecondition.color
            conditionName = rulecondition.name
            break
          }
        } else {
          const qstr3 = {
            text: 'select condition,value from tbl_rule_engine_value where condition_id=$1',
            values: [condition_id]
          }
          let { condition, value } = (await pool.query(qstr3)).rows[0]
          value = parseFloat(value)
          if (condition === 'equal to') {
            if (sensor_value === value) {
              colorcode = rulecondition.color
              conditionName = rulecondition.name
              // console.log('inner', condition, sensor_value, value, colorcode, conditionName)

              break
            }
          } else if (condition === 'greater than') {
            if (sensor_value > value) {
              colorcode = rulecondition.color
              conditionName = rulecondition.name
              // console.log('inner', condition, sensor_value, value, colorcode, conditionName)

              break
            }
          } else if (condition === 'less than') {
            if (sensor_value < value) {
              colorcode = rulecondition.color
              conditionName = rulecondition.name
              // console.log('inner', condition, sensor_value, value, colorcode, conditionName)

              break
            }
          } else if (condition === 'Greater then or equal to') {
            if (sensor_value >= value) {
              colorcode = rulecondition.color
              conditionName = rulecondition.name
              // console.log('inner', condition, sensor_value, value, colorcode, conditionName)
              break
            }
          } else if (condition === 'less then or equal to') {
            if (sensor_value <= value) {
              colorcode = rulecondition.color
              conditionName = rulecondition.name
              // console.log('inner', condition, sensor_value, value, colorcode, conditionName)
              break
            }
          }
        }
      }
    }
    sensorDataObject = {
      // sensorName: datasetName,
      sensorValue: sensor_value,
      sensorValueAddedTime: recorded_at,
      color_code: colorcode,
      condition: conditionName
    }
    sensorValues.push(sensorDataObject)
    return sensorValues
  }
}

module.exports = { eventSubscriber: eventSubscriber, pubsub: pubsub }
