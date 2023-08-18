/* eslint-disable camelcase */

const getDeviceCountryCode = async (pool, deviceId) => {
  const qstr = {
    text: 'select country_code from tbl_user_device_info where mac_address=$1',
    values: [deviceId]
  }
  const { country_code } = (await pool.query(qstr)).rows[0]
  return country_code
}

module.exports = { getDeviceCountryCode }
