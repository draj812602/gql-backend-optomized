/* eslint-disable array-callback-return */
/* eslint-disable camelcase */
const { get_user_id } = require('../../utils/getUserId')
const sendCloudToDeviceMsg = require('../../services/cloudToDeviceMsg')
const { getInitialWidgetData, get_device_dataset_name } = require('../../Queries/DashboardSite/userDashboard')
// const { getDatetime } = require('../../utils/getDateTime')
const { getDatetime } = require('./helper')
const { AuthenticationError } = require('apollo-server-express')
// const { getDateTimeBasedOnCounty } = require('../../utils/getDateTimezoneData')
const { getDeviceCountryCode } = require('../../utils/getDeviceCountryCode')
const { getDeviceTimeZone } = require('../../utils/getDeviceTimeZone')
// const { dateFormatForSensorPower } = require('../../utils/dateFormatForSensorPower')
const { dateForDisplay } = require('../../utils/dateForDisplay')
/* If dashboard name is not exists creates new dashboard with given name */
const save_dashboard_name = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { dashboard_name } = args
      // #1 for beta release :restricted only 5 dashboard per user
      const qstr = {
        text: 'select COUNT(*) as total_dashboards from tbl_user_dashboard where user_id=$1 ',
        values: [user_id]
      }
      const { total_dashboards } = (await pool.query(qstr)).rows[0]
      if (total_dashboards < 5) {
        const qstr1 = {
          text: 'select user_id,dashboard_name from tbl_user_dashboard where user_id=$1 and dashboard_name=$2',
          values: [user_id, dashboard_name]
        }
        const dashboardExist = await pool.query(qstr1)
        if (dashboardExist.rows.length > 0) {
          return new Error(`Dashboard with name ${dashboard_name} is Exists, please use different name`)
        } else {
          const rs = {
            text: 'insert into tbl_user_dashboard(user_id,dashboard_name) values($1,$2) RETURNING dashboard_id,dashboard_name',
            values: [user_id, dashboard_name]
          }
          const dashboardRes = (await pool.query(rs)).rows[0]
          if (dashboardRes) {
            return dashboardRes
          } else {
            return {}
          }
        }
      } else {
        return new Error('Sorry!! You cannot create more than 5 Dashboards')
      }
    }
  } catch (err) {
    return err
  }
}

/* creates widgets (charts and sensorpower widgets)
   charts - created with float and decimal data type values
   sensorpower widgets - created with string and boolean data type values
*/
const save_user_dashboard = async (_, args, { pool, request }) => {
  const token = request.headers.authorization
  const user_id = (await get_user_id(token, pool)).user_id
  if (user_id == null) {
    throw new AuthenticationError('Unautherized User')
  } else {
    const { dashboard_id, widget_name, widget_title, device_id, component_id, rule_id } = args.input
    // #2 for beta release: Restrict 10 Widgets per dashboard
    const qstr = {
      text: 'select COUNT(*) as total_widgets from tbl_dashboard_widget where dashboard_id=$1',
      values: [dashboard_id]
    }
    const { total_widgets } = (await pool.query(qstr)).rows[0]
    if (total_widgets < 10) {
      let dashboardRes = {}
      const widgetResp = []
      let dashboard_name = null
      const qstr1 = {
        text: 'select dashboard_id,user_id,dashboard_name from tbl_user_dashboard where user_id=$1 and dashboard_id=$2',
        values: [user_id, dashboard_id]
      }
      const dashboardExist = await pool.query(qstr1)
      if (dashboardExist.rows.length > 0) {
        dashboard_name = dashboardExist.rows[0].dashboard_name
        let sensorName
        let widgetid
        let sensorData = []
        const sensor_power_data = []
        let data_time_interval = null
        const qstr2 = {
          text: 'select mac_address as device_name,location as device_location from tbl_user_device_info where user_dev_id=$1',
          values: [device_id]
        }
        const { device_name, device_location } = (await pool.query(qstr2)).rows[0]
        let widgetrs, rule_name
        let res2, init_value
        if (widget_name === 'SensorPower') {
          const qstr3 = {
            text: 'insert into tbl_dashboard_widget(dashboard_id,widget_name,widget_title,device_id,component_id) values($1,$2,$3,$4,$5) RETURNING widget_id,widget_name,widget_title,device_id,component_id',
            values: [dashboard_id, widget_name, widget_title, device_id, component_id]
          }
          widgetrs = await pool.query(qstr3)
          widgetid = widgetrs.rows[0].widget_id
          const country_code = await getDeviceCountryCode(pool, device_name)
          const timezoneval = await getDeviceTimeZone(pool, country_code)
          const updated_at = (await getDatetime(timezoneval)).formattedDate
          const qstr4 = {
            text: 'update tbl_user_device_components set is_checked=$1 , updated_at=$2 where user_dev_comp_id=$3 and user_dev_id=$4 RETURNING user_dev_comp_id,component_name,data_type,bool_init_val,string_init_val,in_out,is_checked,updated_at',
            values: [true, updated_at, component_id, device_id]
          }
          res2 = (await pool.query(qstr4)).rows[0]
          const data_type = res2.data_type
          if (data_type === 'String') {
            init_value = res2.string_init_val
          } else {
            init_value = res2.bool_init_val
          }
          const new_updated_at = await dateForDisplay(res2.updated_at)
          const component = {
            data_type: res2.data_type,
            component_id: res2.user_dev_comp_id,
            component_name: res2.component_name,
            init_value: init_value,
            in_out: res2.in_out,
            updated_at: new_updated_at
          }
          sensor_power_data.push(component)
        } else {
          const qstr5 = {
            text: 'insert into tbl_dashboard_widget(dashboard_id,widget_name,widget_title,device_id,rule_id,component_id) values($1,$2,$3,$4,$5,$6) RETURNING widget_id,widget_name,widget_title,device_id,rule_id,component_id',
            values: [dashboard_id, widget_name, widget_title, device_id, rule_id, component_id]
          }
          widgetrs = await pool.query(qstr5)
          const qstr6 = {
            text: 'select component_name from tbl_user_device_components where user_dev_id=$1 and user_dev_comp_id=$2',
            values: [device_id, component_id]
          }
          sensorName = (await pool.query(qstr6)).rows[0].component_name
          widgetid = widgetrs.rows[0].widget_id
          const qstr7 = {
            text: 'select rule_name from tbl_rule_engine_rules where id=$1',
            values: [rule_id]
          }
          rule_name = (await pool.query(qstr7)).rows[0].rule_name
          data_time_interval = '12'
          const args = { datasetName: sensorName, deviceId: device_name, component_id: component_id, rule_id: rule_id, timeInterval: data_time_interval }
          sensorData = await getInitialWidgetData(_, args, { pool })

        // console.log(device_name,sensorData)
        }
        const user_device_datasetname = await get_device_dataset_name(_, args, { pool, request })

        const widget = {
          widget_id: widgetid,
          widget_name: widget_name,
          widget_title: widget_title,
          sensorName: sensorName,
          device_name: device_name,
          device_id: device_id,
          device_location: device_location,
          component_id: component_id,
          rule_id: rule_id,
          rule_name: rule_name,
          data_time_interval: data_time_interval,
          data: sensorData,
          user_device_datasetname: user_device_datasetname,
          sensor_power_data: sensor_power_data
        }
        widgetResp.push(widget)
        dashboardRes = {
          dashboard_id: dashboard_id,
          dashboard_name: dashboard_name,
          widget_data: widgetResp
        }
        return dashboardRes
      } else {
        return new Error('Dashboard Not exists')
      }
    } else {
      return new Error('Sorry!! You cannot create more than 10 widgets')
    }
  }
}

const edit_sensor_widget = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const returnRes = {}
      let sensorData = []
      const { dashboard_id, widget_id, widget_title, device_id, component_id, rule_id, device_name, timeInterval } = args.input
      let qstr1
      if (rule_id == null || rule_id === undefined) {
        qstr1 = {
          text: 'update tbl_dashboard_widget set widget_title=$1 where dashboard_id=$2 and widget_id=$3 RETURNING*',
          values: [widget_title, dashboard_id, widget_id]
        }
      } else {
        qstr1 = {
          text: 'update tbl_dashboard_widget set widget_title=$1, rule_id=$2 where dashboard_id=$3 and widget_id=$4 RETURNING*',
          values: [widget_title, rule_id, dashboard_id, widget_id]
        }
      }

      const editRes = await pool.query(qstr1)
      if (editRes.rowCount === 1) {
        let rule_name = null
        const widgetName = editRes.rows[0].widget_name
        if (widgetName !== 'SensorPower') {
          const qstrtext = {
            text: 'select rule_name from tbl_rule_engine_rules where id=$1',
            values: [rule_id]
          }
          rule_name = (await pool.query(qstrtext)).rows[0].rule_name
        }

        const qstr2 = {
          text: 'select component_name from tbl_user_device_components where user_dev_id=$1 and user_dev_comp_id=$2',
          values: [device_id, component_id]
        }
        const sensorName = (await pool.query(qstr2)).rows[0].component_name
        // console.log("sensorName=",sensorName)
        if (rule_id != null && rule_id !== undefined) {
          const args = { datasetName: sensorName, deviceId: device_name, component_id: component_id, rule_id: rule_id, timeInterval: timeInterval, widgetName: widgetName }
          sensorData = await getInitialWidgetData(_, args, { pool })
        }
        returnRes.dashboard_id = dashboard_id
        returnRes.widget_id = widget_id
        returnRes.widget_title = widget_title
        returnRes.device_id = device_id
        returnRes.component_id = component_id
        returnRes.rule_id = rule_id
        returnRes.rule_name = rule_name
        returnRes.data = sensorData
        returnRes.timeInterval = timeInterval
      }
      return returnRes
    }
  } catch (err) {
    return err
  }
}
const edit_dashboard_name = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { dashboard_id, new_name } = args
      const query1 = {
        text: 'select dashboard_id from tbl_user_dashboard where user_id=$1 and dashboard_id=$2',
        values: [user_id, dashboard_id]
      }
      const userDashboardExistRes = await pool.query(query1)
      if (userDashboardExistRes.rows.length > 0) {
        const query2 = {
          text: 'update tbl_user_dashboard set dashboard_name=$1 where dashboard_id=$2',
          values: [new_name, dashboard_id]
        }
        const editDashBoardRes = await pool.query(query2)
        // console.log(editDashBoardRes);
        if (editDashBoardRes.rowCount === 1) {
          return 'Dashboard name edited successfully'
        } else {
          return new Error('Error in editing dashboard name')
        }
      } else {
        return new Error('Unauthorized User')
      }
    }
  } catch (err) {
    return err
  }
}
/* When dashboard is deleted its corresponding widgets will also deleted.
*/
const delete_user_dashboard = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { dashboard_id } = args
      const qstr1 = {
        text: 'select rule_id,component_id from tbl_dashboard_widget where dashboard_id=$1',
        values: [dashboard_id]
      }
      const components = await pool.query(qstr1)
      // let compIdRes = await pool.query(`select c.user_dev_comp_id from tbl_widget_components c , tbl_dashboard_widget w where w.dashboard_id=${dashboard_id} and c.widget_id=w.widget_id`);
      const comp_ids = []
      if (components.rowCount !== 0) {
        components.rows.map((data) => {
          const id = data.component_id
          const ruleid = data.rule_id
          if (ruleid == null) {
            comp_ids.push(id)
          }
        })
      }
      const query1 = {
        text: 'delete from tbl_user_dashboard where user_id=$1 and dashboard_id=$2',
        values: [user_id, dashboard_id]
      }
      const dahboardDeleteRes = await pool.query(query1)
      /*  used Sensorpower widget components are reverted as not used */
      if (dahboardDeleteRes.rowCount === 1) {
        if (comp_ids.length !== 0) {
          comp_ids.map(async (data) => {
            const qstr2 = {
              // eslint-disable-next-line quotes
              text: `update tbl_user_device_components set is_checked=$1 where user_dev_comp_id in ($2)`,
              values: [false, data]
            }
            await pool.query(qstr2)
          })
        }
        return 'Dashboard deleted successfully'
      } else {
        return new Error('Error in deleting Dashboard')
      }
    }
  } catch (err) {
    return err
  }
}

const delete_widget = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { dashboard_id, widget_id } = args
      const qstr1 = {
        text: 'select rule_id,component_id from tbl_dashboard_widget where dashboard_id=$1 and widget_id=$2',
        values: [dashboard_id, widget_id]
      }
      const components = await pool.query(qstr1)
      let comp_id, rule_id
      if (components.rowCount !== 0) {
        components.rows.map((data) => {
          comp_id = data.component_id
          rule_id = data.rule_id
        })
      }
      const qstr2 = {
        text: 'delete from tbl_dashboard_widget where dashboard_id=$1 and widget_id=$2',
        values: [dashboard_id, widget_id]
      }
      const widgetDeleteRes = await pool.query(qstr2)
      if (widgetDeleteRes.rowCount === 1) {
        if (rule_id == null) {
          const qstr3 = {
            text: 'update tbl_user_device_components set is_checked=$1 where user_dev_comp_id=$2',
            values: [false, comp_id]
          }
          await pool.query(qstr3)
        }
        return 'Widget deleted successfully'
      } else {
        return new Error('Error in deleting widget')
      }
    }
  } catch (err) {
    return err
  }
}

/** This function is not using */
const deleteWidgetComp = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { widget_id, component_id } = args
      const qstr1 = {
        text: 'delete from tbl_widget_components where widget_id=$1 and user_dev_comp_id=$2',
        values: [widget_id, component_id]
      }
      const deleteCompRes = (await pool.query(qstr1)).rowCount
      if (deleteCompRes === 1) {
        const qstr2 = {
          text: 'update tbl_user_device_components set is_checked=$1 where user_dev_comp_id=$2',
          values: [false, component_id]
        }
        await pool.query(qstr2)
        return 'component deleted successfully'
      } else {
        return new Error('Error in deleting component')
      }
    }
  } catch (err) {
    return err
  }
}

/* c2d message sending through direct method */
const update_user_components = async (_, args, { request, pool }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { dashboard_id, widget_id, device_id, comp_id, data_type, init_value } = args.input
      console.log('init value=', init_value)
      // let string_init_val, bool_init_val;
      const sensorPowerData = []
      let { component_name, in_out, bool_init_val, string_init_val } = (await pool.query(`select component_name,in_out,bool_init_val,string_init_val,updated_at from tbl_user_device_components where user_dev_comp_id=${comp_id}`)).rows[0]
      const qstr1 = {
        text: 'select mac_address from tbl_user_device_info where user_dev_id=$1',
        values: [device_id]
      }
      const device_macc = (await pool.query(qstr1)).rows[0].mac_address

      const target_device = device_macc.replace(/:/g, '')
      const qstr2 = {
        text: 'select c.device_comp_id from tbl_devices d,tbl_device_components c where d.mac_address=$1 and d.grp_enroll_id=c.grp_enr_id and c.dev_name=$2',
        values: [device_macc, component_name]
      }
      const qRes = (await pool.query(qstr2))
      const { device_comp_id } = qRes.rows[0]
      const qstr3 = {
        text: 'select direct_method_name,conn_timeout,method_timeout from tbl_c2d_component_properties where device_comp_id=$1',
        values: [device_comp_id]
      }
      const directMethodInfo = await pool.query(qstr3)
      let method_name, method_timeout, connection_timeout
      if (directMethodInfo.rows.length > 0) {
        directMethodInfo.rows.map((data) => {
          method_name = data.direct_method_name
          method_timeout = data.method_timeout
          connection_timeout = data.conn_timeout
        })
      }

      // let init_value_obj=`{'${component_name}':${init_value}}`
      // const country_code = await getDeviceCountryCode(pool, device_macc)
      const feedback = await sendCloudToDeviceMsg.sendCloudToDeviceMsg(target_device, method_name, method_timeout, connection_timeout, init_value)
      let deviceResponse, responseType
      let initVal, res
      // console.log(bool_init_val+" "+string_init_val)
      if (data_type === 'String') {
        initVal = string_init_val
      } else if (data_type === 'Boolean') {
        initVal = bool_init_val
      }
      const country_code = await getDeviceCountryCode(pool, device_macc)
      const timezoneval = await getDeviceTimeZone(pool, country_code)
      const updatedTime = await (await getDatetime(timezoneval)).formattedDate
      if (feedback.code === 200) {
        deviceResponse = 'Success'
        responseType = 'success'
        // const updated_at = await getDateTimeBasedOnCounty(pool, country_code, new Date())
        // updated_at = (await getDatetime()).formattedDate
        if (data_type === 'String') {
          string_init_val = init_value
          const querystr = {
            text: 'update tbl_user_device_components set string_init_val=$1,updated_at=$2 where user_dev_comp_id=$3 and user_dev_id=$4 and is_checked=$5 RETURNING user_dev_comp_id,component_name,data_type,string_init_val,in_out,updated_at',
            values: [string_init_val, updatedTime, comp_id, device_id, true]
          }
          res = (await pool.query(querystr)).rows[0]
          initVal = res.string_init_val
        }
        if (data_type === 'Boolean') {
          if (init_value === 'true') bool_init_val = true
          if (init_value === 'false') bool_init_val = false
          const qstr = {
            text: 'update tbl_user_device_components set bool_init_val=$1,updated_at=$2 where user_dev_comp_id=$3 and user_dev_id=$4 and is_checked=$5 RETURNING user_dev_comp_id,component_name,data_type,bool_init_val,in_out,updated_at',
            values: [bool_init_val, updatedTime, comp_id, device_id, true]
          }
          res = (await pool.query(qstr)).rows[0]
          initVal = res.bool_init_val
        }
      } else if (feedback.code === 404) {
        deviceResponse = 'code= ' + feedback.code + ",ResponseMsg= The operation failed because the requested device isn't online"
        responseType = 'connection_time_out'
      } else if (feedback.code === 504) {
        deviceResponse = 'code= ' + feedback.code + ', ResponseMsg= Timed out waiting for the response from device'
        responseType = 'method_time_out'
      } else {
        deviceResponse = 'code= ' + feedback.code + ', ResponseMsg= ' + feedback.msg
        responseType = 'error'
      }

      // console.log("res=",res)
      // console.log("type=",res.data_type)
      const new_updated_at = await dateForDisplay(updatedTime)
      const sComp = {
        dashboard_id: dashboard_id,
        widget_id: widget_id,
        data_type: data_type,
        component_id: comp_id,
        component_name: component_name,
        init_value: initVal,
        in_out: in_out,
        updated_at: new_updated_at,
        response: deviceResponse,
        responseType: responseType
      }
      sensorPowerData.push(sComp)
      return sensorPowerData
    }
  } catch (err) {
    return err
  }
}
const getSensorDataOnTimeInterval = async (_, args, { pool, request }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      let sensorData = []
      const widgetinfo = {}

      const { widget_id, mac_address, component_id, datasetName, rule_id, timeInterval } = args.input
      const qstr1 = {
        text: 'update tbl_dashboard_widget set data_time_interval = $1 where widget_id = $2',
        values: [timeInterval, widget_id]
      }
      await pool.query(qstr1)
      const qstr2 = {
        text: 'select widget_name from tbl_dashboard_widget where widget_id = $1',
        values: [widget_id]
      }
      const widgetName = (await pool.query(qstr2)).rows[0].widget_name
      args = { datasetName: datasetName, deviceId: mac_address, component_id: component_id, rule_id: rule_id, timeInterval: timeInterval, widgetName: widgetName }
      sensorData = await getInitialWidgetData(_, args, { pool })
      widgetinfo.device_id = mac_address
      widgetinfo.sensorName = datasetName
      widgetinfo.component_id = component_id
      widgetinfo.rule_id = rule_id
      widgetinfo.data_time_interval = timeInterval
      widgetinfo.data = sensorData
      widgetinfo.widget_id = widget_id
      return widgetinfo
    }
  } catch (error) {
    return error
  }
}

module.exports = {
  save_dashboard_name,
  save_user_dashboard,
  edit_dashboard_name,
  delete_user_dashboard,
  delete_widget,
  deleteWidgetComp,
  update_user_components,
  edit_sensor_widget,
  getSensorDataOnTimeInterval
}
