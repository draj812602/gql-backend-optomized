/* eslint-disable array-callback-return */
/* eslint-disable camelcase */
const { AuthenticationError } = require('apollo-server-express')
const { get_user_id } = require('../../utils/getUserId')
const { getDeviceCountryCode } = require('../../utils/getDeviceCountryCode')
const { getDeviceTimeZone } = require('../../utils/getDeviceTimeZone')
const { dateForDisplay } = require('../../utils/dateForDisplay')

const get_user_dahboard_data = async (_, args, { pool, request }) => {
  const token = request.headers.authorization
  const user_id = (await get_user_id(token, pool)).user_id
  if (user_id == null) {
    throw new AuthenticationError('Unautherized User')
  } else {
    const dashboardArray = []
    const query2 = {
      text: 'select * from tbl_user_dashboard WHERE user_id=$1 ',
      values: [user_id]
    }
    // User dashboards
    const dashboardinfo = (await pool.query(query2)).rows
    if (dashboardinfo.length > 0) {
      let i = 0
      for (const x of dashboardinfo) {
        const dashbid = x.dashboard_id
        const qs = {
          text: 'select widget_id,widget_name,widget_title,device_id,rule_id,component_id from tbl_dashboard_widget WHERE dashboard_id=$1 ',
          values: [dashbid]
        }
        // Widgets of a Dashboards
        const widgetinfo = (await pool.query(qs)).rows
        const widgetArray = []
        let j = 0
        for (const y of widgetinfo) {
          const sensor_power_data = []
          let sensorData = []
          let device_datasetname = []
          const user_device_id = y.device_id
          const comp_id = y.component_id
          const widgetName = y.widget_name
          let datasetName = null
          let rule_name = null
          const rule_id = y.rule_id
          const qstr1 = {
            text: 'select user_dev_id,mac_address,location from tbl_user_device_info where user_dev_id=$1',
            values: [user_device_id]
          }

          const { user_dev_id, mac_address, location } = (await pool.query(qstr1)).rows[0]

          if (widgetName !== 'SensorPower') {
            if (rule_id != null) {
              const qq = {
                text: 'select rule_name from tbl_rule_engine_rules where id=$1',
                values: [rule_id]
              }
              const qRes = (await pool.query(qq))
              rule_name = qRes.rows[0].rule_name
            }
            const qstr2 = {
              text: 'select component_name from tbl_user_device_components where user_dev_id=$1 and user_dev_comp_id=$2',
              values: [user_device_id, comp_id]
            }
            datasetName = (await pool.query(qstr2)).rows[0].component_name
            const args = { datasetName: datasetName, deviceId: mac_address, component_id: comp_id, rule_id: rule_id, widgetName: widgetName }
            sensorData = await getInitialWidgetData(_, args, { pool })
            console.log('sensorData=', sensorData)
            widgetinfo[j].sensorName = datasetName
            // widgetinfo[j].sensor_power_data = sensor_power_data;
          } else {
            const qstr3 = {
              text: 'select user_dev_comp_id as component_id,data_type,component_name,string_init_val,bool_init_val,in_out,updated_at from tbl_user_device_components where user_dev_comp_id=$1 and user_dev_id=$2',
              values: [comp_id, user_device_id]
            }
            const compData = await pool.query(qstr3)
            // for(data of compData.rows){
            compData.rows.map((data) => {
              let init_value = null
              if (data.data_type === 'String') { init_value = data.string_init_val }
              if (data.data_type === 'Boolean') { init_value = data.bool_init_val }
              const comp = {
                data_type: data.data_type,
                component_id: data.component_id,
                component_name: data.component_name,
                init_value: init_value,
                in_out: data.in_out,
                updated_at: data.updated_at
              }
              // console.log(comp);
              sensor_power_data.push(comp)
            })
          }

          widgetinfo[j].sensor_power_data = sensor_power_data
          widgetinfo[j].data = sensorData
          widgetinfo[j].device_name = mac_address
          widgetinfo[j].device_id = user_dev_id
          widgetinfo[j].device_location = location
          device_datasetname = await get_device_dataset_name(_, args, { pool, request })
          console.log(device_datasetname)
          widgetinfo[j].user_device_datasetname = device_datasetname
          widgetinfo[j].component_id = comp_id
          widgetinfo[j].rule_id = rule_id
          widgetinfo[j].rule_name = rule_name
          widgetArray.push(widgetinfo[j])
          j++
        }
        // console.log("widget info=", JSON.stringify(widgetArray));
        dashboardinfo[i].widget_data = widgetArray
        dashboardArray.push(dashboardinfo[i])
        i++
      }
      return dashboardArray
    } else {
      return []
    }
    // console.log("dashboard info=", JSON.stringify(dashboardArray));
  }
}

// Get user all devices dataset names and device components names
const get_device_dataset_name = async (_, args, { pool, request }) => {
  const token = request.headers.authorization
  const user_id = (await get_user_id(token, pool)).user_id
  if (user_id == null) {
    throw new AuthenticationError('Unautherized User')
  } else {
    const device_name_dataset = []
    const qstr1 = {
      text: 'select user_dev_id as device_id,mac_address as device_name from tbl_user_device_info where user_id=$1 and is_activated=$2',
      values: [user_id, true]
    }
    const res1 = await pool.query(qstr1)
    const devices = res1.rows
    if (devices.length > 0) {
      // for (let i = 0; i < res1.rows.length; i++) {
      for (const device of devices) {
        const deviceDataset = {}
        const user_dev_id = device.device_id
        deviceDataset.device_id = device.device_id
        deviceDataset.device_name = device.device_name
        const qstr2 = {
          text: 'select component_name as dataset_name ,user_dev_comp_id from tbl_user_device_components where user_dev_id=$1 and (data_type=$2 or data_type=$3) and is_checked=$4 ',
          values: [user_dev_id, 'Float', 'Decimal', false]
        }
        const res2 = await pool.query(qstr2)

        const datasets = res2.rows
        const device_dataset_arr = []

        if (datasets.length > 0) {
          for (const dataset of datasets) {
            const rules = []
            const dataset_name = dataset.dataset_name
            const comp_id = dataset.user_dev_comp_id
            const qstr3 = {
              text: 'select r2.id,r2.rule_name from tbl_rule_engine r1,tbl_rule_engine_rules r2 where  r2.dev_rule_id=r1.id and r1.component_id=$1 ',
              values: [comp_id]
            }
            const comp_rules = await pool.query(qstr3)
            if (comp_rules.rows.length > 0) {
              comp_rules.rows.map((data) => {
                const rule_info = {}
                rule_info.rule_id = data.id
                rule_info.rule_name = data.rule_name
                rules.push(rule_info)
              })
            }
            const data_set = {
              component_id: comp_id,
              dataset_name: dataset_name,
              rules: rules
            }
            // console.log("data_set=",JSON.stringify(data_set))
            device_dataset_arr.push(data_set)
            // device_dataset_arr.push({ dataset_name: dataset_name });
          }
        }
        deviceDataset.device_dataset = device_dataset_arr
        const qstr4 = {
          text: 'select user_dev_comp_id as component_id,component_name,is_checked from tbl_user_device_components where user_dev_id=$1 and data_type!=$2 and data_type!=$3 and is_checked=$4',
          values: [user_dev_id, 'Float', 'Decimal', false]
        }
        const dev_components = await pool.query(qstr4)
        const devComponentNames = []
        if (dev_components.rows.length > 0) {
          dev_components.rows.map((data) => {
            devComponentNames.push(data)
          })
        }
        deviceDataset.dev_component_names = devComponentNames
        device_name_dataset.push(deviceDataset)
        // console.log("inside",deviceDataset)
      }
      // console.log("outside",device_name_dataset)
      return device_name_dataset
    } else {
      return []
    }
  }
}

// get initial chart data by apllying rule
const getInitialWidgetData = async (_, args, { pool }) => {
  try {
    const { datasetName, deviceId, rule_id, timeInterval, widgetName } = args
    let data_limit
    if (widgetName === 'ColumnChart' || widgetName === 'LineChart') {
      data_limit = 25
    } else {
      data_limit = 6
    }
    console.log(widgetName, data_limit)
    let sensorDataObject = {
      sensorValue: '',
      sensorValueAddedTime: '',
      color_code: '',
      condition: ''
    }
    const sensorValues = []
    let iscompExists = false
    const qstr1 = {
      text: 'select json_object_keys(data) as key from tbl_sensor_data where device_id=$1',
      values: [deviceId]
    }
    const checkCompName = (await pool.query(qstr1)).rows
    for (const compname of checkCompName) {
      if (compname.key === datasetName) {
        iscompExists = true
        break
      }
    }
    if (iscompExists === true) {
      // let comp_id=

      // const getRecordedPeriod=`SELECT data->'${datasetName}' as sensorvalue, "recorded_at" FROM tbl_sensor_data WHERE "device_id" = '${deviceId}'`
      //   if(getRecordedPeriod.rows.length>0){

      //   }
      let ruleConditionRes
      if (rule_id != null && rule_id !== undefined) {
        const qstr1 = {
          text: 'select id,name,color,condition_flag from tbl_rule_engine_conditions where rule_id=$1',
          values: [rule_id]
        }
        ruleConditionRes = await pool.query(qstr1)
      }

      // const getInitialWidgetDataQuery = {
      //   text: ' SELECT data->$1 as sensorvalue, "recorded_at" FROM tbl_sensor_data WHERE "device_id" = $2 and (data->$3) is not null order by TO_TIMESTAMP(trim(\'am,PM,pm,AM\' from "recorded_at"),\'MM-DD-YYYYHH:MI:SS\') desc limit 6',
      //   values: [datasetName, deviceId, datasetName]
      // }
      let getInitialWidgetDataQuery
      if (timeInterval != null && timeInterval !== undefined) {
        /** Fetch device timezone  from user device info table */
        const country_code = await getDeviceCountryCode(pool, deviceId)
        const timezoneval = await getDeviceTimeZone(pool, country_code)

        if (timeInterval === '1') {
          getInitialWidgetDataQuery = {
            text: ' SELECT data->$1 as sensorvalue, "recorded_at" ' +
                    'FROM tbl_sensor_data WHERE "device_id" = $2 ' +
                    'and (data->$3) is not null ' +
                    'and (TO_TIMESTAMP( "recorded_at",\'MM-DD-YYYY HH24:MI:SS\')) between (NOW() at time zone $4 - interval \'1 hour\') and (NOW() at time zone $4 ) order by TO_TIMESTAMP("recorded_at",\'MM-DD-YYYY HH24:MI:SS\') desc limit $5',
            values: [datasetName, deviceId, datasetName, timezoneval, data_limit]
          }
        } else if (timeInterval === '12') {
          getInitialWidgetDataQuery = {
            text: ' SELECT data->$1 as sensorvalue, "recorded_at"' +
            'FROM tbl_sensor_data WHERE "device_id" = $2 ' +
            'and  (data->$3) is not null ' +
            'and (TO_TIMESTAMP( "recorded_at",\'MM-DD-YYYY HH24:MI:SS\')) between (NOW() at time zone $4 - interval \'12 hour\') and (NOW() at time zone $4 ) order by TO_TIMESTAMP("recorded_at",\'MM-DD-YYYY HH24:MI:SS\') desc limit $5',
            values: [datasetName, deviceId, datasetName, timezoneval, data_limit]
          }
        } else if (timeInterval === 'live') {
          getInitialWidgetDataQuery = {
            text: ' SELECT data->$1 as sensorvalue, "recorded_at"' +
            'FROM tbl_sensor_data WHERE "device_id" = $2 ' +
            'and  (data->$3) is not null ' +
            'and (TO_TIMESTAMP( "recorded_at",\'MM-DD-YYYY HH24:MI:SS\')) between (NOW() at time zone $4 - interval \'30 mins\') and (NOW() at time zone $4 ) order by TO_TIMESTAMP("recorded_at",\'MM-DD-YYYY HH24:MI:SS\') desc limit $5',
            values: [datasetName, deviceId, datasetName, timezoneval, data_limit]
          }
          // return []
        }
      } else {
        getInitialWidgetDataQuery = {
          text: ' SELECT data->$1 as sensorvalue, "recorded_at" FROM tbl_sensor_data WHERE "device_id" = $2 and (data->$3) is not null order by TO_TIMESTAMP("recorded_at",\'MM-DD-YYYY HH24:MI:SS\') desc limit $4',
          values: [datasetName, deviceId, datasetName, data_limit]
        }
      }
      console.log(getInitialWidgetDataQuery)
      const getInitialWidgetDataRes = await pool.query(getInitialWidgetDataQuery)
      // console.log(deviceId+"-"+component_id)
      const widgetSortedData = (getInitialWidgetDataRes.rows).reverse()
      console.log(widgetSortedData)
      if (widgetSortedData.length > 0) {
        // getInitialWidgetDataRes.rows.map(async(data) => {
        for (const widgetdata of widgetSortedData) {
          let sensor_value = widgetdata.sensorvalue
          const recorded_at = await dateForDisplay(widgetdata.recorded_at)

          if (sensor_value != null) {
            sensor_value = parseFloat(sensor_value)
            let conditionName = null; let colorcode = null
            if (rule_id != null && rule_id !== undefined) {
              // let ruleConditionRes=await pool.query(`select id,name,color,condition_flag from tbl_rule_engine_conditions where rule_id=${rule_id}`)
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
                    if (condition === 'equal to' && sensor_value === value) {
                      // if(sensor_value==value){
                      colorcode = rulecondition.color
                      conditionName = rulecondition.name

                      break
                      // }
                    } else if (condition === 'greater than' && sensor_value > value) {
                      // if(sensor_value>value){
                      colorcode = rulecondition.color
                      conditionName = rulecondition.name

                      break
                      // }
                    } else if (condition === 'less than' && sensor_value < value) {
                      // if(sensor_value<value){
                      colorcode = rulecondition.color
                      conditionName = rulecondition.name

                      break
                      // }
                    } else if (condition === 'Greater then or equal to' && sensor_value >= value) {
                      // if(sensor_value>=value){
                      colorcode = rulecondition.color
                      conditionName = rulecondition.name

                      break
                      // }
                    } else if (condition === 'less then or equal to' && sensor_value <= value) {
                      // if(sensor_value<=value){

                      colorcode = rulecondition.color
                      conditionName = rulecondition.name
                      break

                      // }
                    }
                  }
                }
                console.log('break inner loop')
              }
              sensorDataObject = {
                // sensorName: datasetName,
                sensorValue: widgetdata.sensorvalue,
                sensorValueAddedTime: recorded_at,
                color_code: colorcode,
                condition: conditionName
              }
            } else {
              sensorDataObject = {
                sensorValue: widgetdata.sensorvalue,
                sensorValueAddedTime: recorded_at,
                color_code: '',
                condition: ''
              }
            }

            sensorValues.push(sensorDataObject)
          }
        }
        return sensorValues
      } else {
        return []
      }
    } else {
      return []
    }
  } catch (error) {
    return error
  }
}
const getUserDashboardNames = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const query2 = {
        text: 'select * from tbl_user_dashboard WHERE user_id=$1 ',
        values: [user_id]
      }
      const dashboardinfo = (await pool.query(query2)).rows
      if (dashboardinfo.length > 0) {
        return dashboardinfo
      } else {
        return []
      }
    }
  } catch (error) {
    return error
  }
}

/** * Dashboard Info for UI with Dashboard ID */
const getUserDashboardWidgetInfo = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { dashboard_id } = args
      const qs = {
        text: 'select widget_id,widget_name,widget_title,device_id,rule_id,component_id,data_time_interval from tbl_dashboard_widget WHERE dashboard_id=$1 ',
        values: [dashboard_id]
      }
      const widgetinfo = (await pool.query(qs)).rows
      const widgetData = []
      let j = 0
      if (widgetinfo.length > 0) {
        for (const y of widgetinfo) {
          const sensor_power_data = []
          let sensorData = []
          let device_datasetname = []
          const user_device_id = y.device_id
          const comp_id = y.component_id
          const widgetName = y.widget_name
          let datasetName = null
          let rule_name = null
          const rule_id = y.rule_id
          const data_time_interval = y.data_time_interval
          const qstr1 = {
            text: 'select user_dev_id,mac_address,location from tbl_user_device_info where user_dev_id=$1',
            values: [user_device_id]
          }

          const { user_dev_id, mac_address, location } = (await pool.query(qstr1)).rows[0]

          if (widgetName !== 'SensorPower') {
            if (rule_id != null) {
              const qq = {
                text: 'select rule_name from tbl_rule_engine_rules where id=$1',
                values: [rule_id]
              }
              const qRes = (await pool.query(qq))
              rule_name = qRes.rows[0].rule_name
            }
            const qstr2 = {
              text: 'select component_name from tbl_user_device_components where user_dev_id=$1 and user_dev_comp_id=$2',
              values: [user_device_id, comp_id]
            }
            datasetName = (await pool.query(qstr2)).rows[0].component_name
            const args = { datasetName: datasetName, deviceId: mac_address, component_id: comp_id, rule_id: rule_id, timeInterval: data_time_interval, widgetName: widgetName }
            sensorData = await getInitialWidgetData(_, args, { pool })
            console.log('sensorData=', sensorData)
            widgetinfo[j].sensorName = datasetName
            // widgetinfo[j].sensor_power_data = sensor_power_data;
          } else {
            const qstr3 = {
              text: 'select user_dev_comp_id as component_id,data_type,component_name,string_init_val,bool_init_val,in_out,updated_at from tbl_user_device_components where user_dev_comp_id=$1 and user_dev_id=$2',
              values: [comp_id, user_device_id]
            }
            const compData = await pool.query(qstr3)
            // for(data of compData.rows){
            compData.rows.map(async (data) => {
              let init_value = null
              if (data.data_type === 'String') { init_value = data.string_init_val }
              if (data.data_type === 'Boolean') { init_value = data.bool_init_val }
              // const updated_at = (data.updated_at).split(',')
              // let date = updated_at[0]
              // const month = new Date(date).toLocaleString('default', { month: 'long' })
              // date = date.split('/')
              // date = `${month}.${date[1]}.${date[2]}`
              // const new_updated_at = `${date}` + ' ' + `${updated_at[1]}`
              const new_updated_at = await dateForDisplay(data.updated_at)
              const comp = {
                data_type: data.data_type,
                component_id: data.component_id,
                component_name: data.component_name,
                init_value: init_value,
                in_out: data.in_out,
                updated_at: new_updated_at
              }
              // console.log(comp);
              sensor_power_data.push(comp)
            })
          }

          widgetinfo[j].sensor_power_data = sensor_power_data
          widgetinfo[j].data = sensorData
          widgetinfo[j].device_name = mac_address
          widgetinfo[j].device_id = user_dev_id
          widgetinfo[j].device_location = location
          device_datasetname = await get_device_dataset_name(_, args, { pool, request })
          console.log(device_datasetname)
          widgetinfo[j].user_device_datasetname = device_datasetname
          widgetinfo[j].component_id = comp_id
          widgetinfo[j].rule_id = rule_id
          widgetinfo[j].rule_name = rule_name
          widgetinfo[j].data_time_interval = data_time_interval
          widgetData.push(widgetinfo[j])
          j++
        }
        // console.log(widgetData)
        return widgetData
      } else {
        return []
      }
    }
  } catch (error) {
    return error
  }
}

module.exports = {
  get_user_dahboard_data,
  get_device_dataset_name,
  getInitialWidgetData,
  getUserDashboardNames,
  getUserDashboardWidgetInfo
}
