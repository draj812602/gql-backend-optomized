/* eslint-disable camelcase */
const { get_user_id } = require('../../utils/getUserId')
const { AuthenticationError } = require('apollo-server-express')

// Display registered all devices of logged in user
const get_user_devices = async (_, args, { pool, request }) => {
  const token = request.headers.authorization
  const user_id = (await get_user_id(token, pool)).user_id
  if (user_id == null) {
    throw new AuthenticationError('Unautherized User')
  } else {
    const qstr1 = {
      text: 'select manufacturer_dev_id,mac_address,location,is_activated from tbl_user_device_info where user_id=$1',
      values: [user_id]
    }
    const res1 = await pool.query(qstr1)
    const userDevices = []
    if (res1.rows.length > 0) {
      for (let i = 0; i < res1.rows.length; i++) {
        const mac_address = res1.rows[i].mac_address
        const qstr2 = {
          text: 'select grp_enroll_id from tbl_devices where mac_address=$1',
          values: [mac_address]
        }
        const grpEnrollId = (await pool.query(qstr2)).rows[0].grp_enroll_id
        const qstr3 = {
          text: 'select device_type from tbl_grp_enrollment_info where grp_enrollment_id=$1',
          values: [grpEnrollId]
        }
        const device_type = (await pool.query(qstr3)).rows[0].device_type
        res1.rows[i].device_type = device_type
        userDevices.push(res1.rows[i])
      }
      return userDevices
    } else {
      return []
    }
  }
}

module.exports = { get_user_devices }
