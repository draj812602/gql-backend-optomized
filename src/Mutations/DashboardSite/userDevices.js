/* eslint-disable camelcase */
const { get_user_id } = require('../../utils/getUserId')
// const cosmosDb = require('../../services/cosmosDB/cosmosDbOperations')
const { getDatetime } = require('./helper')
const { AuthenticationError } = require('apollo-server-express')
const { getDeviceCountryCode } = require('../../utils/getDeviceCountryCode')
const { getDeviceTimeZone } = require('../../utils/getDeviceTimeZone')
/* registering device does following functions
   - device mac address and location of the device is saved in db
   - Location of device will be updated into device twin of registered device on IoT hub
   - device cmponents from manufacturer site are fetched and saved into user dashboard site (to modify its values on device installed environment) */
const register_user_device = async (_, args, { pool, request }) => {
  const { input } = args
  const token = request.headers.authorization
  const { user_id } = (await get_user_id(token, pool))
  if (user_id == null) {
    throw new AuthenticationError('Unautherized User')
  } else {
    const mac_address = input.mac_address
    const deviceLocation = input.deviceLocation
    const { label, value } = input.country
    const qstr1 = {
      text: 'select device_id,mac_address from tbl_devices where mac_address=$1',
      values: [mac_address]
    }
    // check is given mac address exist at manufacturer site
    const res1 = await pool.query(qstr1)
    if (res1.rows.length <= 0) {
      return new Error(`Device with MAC address ${mac_address} is not found `)
    } else {
      const qstr2 = {
        text: 'select mac_address from tbl_user_device_info WHERE mac_address=$1',
        values: [mac_address]
      }
      // check is given mac address already registered at dashboard site, if not then continue registration process
      const res11 = await pool.query(qstr2)
      if (res11.rows.length <= 0) {
        const manufacturer_device_id = res1.rows[0].device_id
        const created_at = new Date()
        const updated_at = new Date()
        // insert device basic information
        const qstr1 = {
          text: 'insert into tbl_user_device_info(user_id,mac_address,location,created_at,updated_at,manufacturer_dev_id,country,country_code) values($1,$2,$3,$4,$5,$6,$7,$8) returning user_dev_id,mac_address,location,is_activated,country,country_code',
          values: [user_id, mac_address, deviceLocation, created_at, updated_at, manufacturer_device_id, label, value]
        }
        const res2 = await pool.query(qstr1)
        if (res2.rowCount === 1) {
          const user_dev_id = res2.rows[0].user_dev_id
          const qstr2 = {
            text: 'select grp_enroll_id from tbl_devices where mac_address=$1',
            values: [mac_address]
          }
          const grpEnrollId = (await pool.query(qstr2)).rows[0].grp_enroll_id
          // fetch device components from manufactirer site and add them into user specific dashboard site
          const qstr3 = {
            text: 'select * from tbl_device_components where grp_enr_id=$1',
            values: [grpEnrollId]
          }
          const devComponetnts = (await pool.query(qstr3)).rows
          if (devComponetnts.length > 0) {
            const country_code = await getDeviceCountryCode(pool, mac_address)
            const timezoneval = await getDeviceTimeZone(pool, country_code)
            const date_time1 = (await getDatetime(timezoneval)).formattedDate
            const created_at = date_time1
            const updated_at = date_time1
            for (const devcomp of devComponetnts) {
              const { device_comp_id, dev_name, data_type, in_out } = devcomp
              let initial_value
              if ((data_type === 'String' || data_type === 'Boolean') && in_out === 'D2C') {
                const qstr4 = {
                  text: `insert into tbl_user_device_components(user_dev_id,component_name,data_type,in_out,created_at,updated_at) 
                  values($1,$2,$3,$4,$5,$6)`,
                  values: [user_dev_id, dev_name, data_type, in_out, created_at, updated_at]
                }
                await pool.query(qstr4)
              }
              if (in_out === 'C2D') {
                const queryStr = {
                  text: 'select payload from tbl_c2d_component_properties where device_comp_id=$1',
                  values: [device_comp_id]
                }
                const { payload } = (await pool.query(queryStr)).rows[0]
                if (data_type === 'String') {
                  initial_value = payload
                  const qstr6 = {
                    text: `insert into tbl_user_device_components(user_dev_id,component_name,data_type,string_init_val,in_out,created_at,updated_at) 
                    values($1,$2,$3,$4,$5,$6,$7)`,
                    values: [user_dev_id, dev_name, data_type, initial_value, in_out, created_at, updated_at]
                  }
                  await pool.query(qstr6)
                } else if (data_type === 'Boolean') {
                  if (payload === 'true') { initial_value = true }
                  if (payload === 'false') { initial_value = false }
                  const qstr7 = {
                    text: `insert into tbl_user_device_components(user_dev_id,component_name,data_type,bool_init_val,in_out,created_at,updated_at) 
                    values($1,$2,$3,$4,$5,$6,$7)`,
                    values: [user_dev_id, dev_name, data_type, initial_value, in_out, created_at, updated_at]

                  }
                  await pool.query(qstr7)
                }
              }
              if ((data_type === 'Float' || data_type === 'Decimal') && in_out === 'D2C') {
                const sensorValueRange = await pool.query(`select * from tbl_d2c_component_properties where device_comp_id=${device_comp_id}`)
                if (sensorValueRange.rows.length > 0) {
                  const { min_value, max_value } = sensorValueRange.rows[0]
                  const qstr7 = {
                    text: `insert into tbl_user_device_components(user_dev_id,component_name,data_type,in_out,created_at,updated_at,min_value,max_value) 
                    values($1,$2,$3,$4,$5,$6,$7,$8)`,
                    values: [user_dev_id, dev_name, data_type, in_out, created_at, updated_at, min_value, max_value]
                  }
                  await pool.query(qstr7)
                } else {
                  const qstr8 = {
                    text: `insert into tbl_user_device_components(user_dev_id,component_name,data_type,in_out,created_at,updated_at) 
                    values($1,$2,$3,$4,$5,$6)`,
                    values: [user_dev_id, dev_name, data_type, in_out, created_at, updated_at]
                  }
                  await pool.query(qstr8)
                }
              }
            }
          }
          /* update location of device installed into device twin */
          // const dbRes = await cosmosDb.updateDeviceLocation(mac_address, deviceLocation)
          // console.log('consmosdb=', dbRes)
          const response = res2.rows[0]
          return response
        } else {
          return new Error('DB error')
        }
      } else {
        return new Error(
                    `Device with MAC address ${mac_address} is already registered `
        )
      }
    }
  }
}

module.exports = { register_user_device }
