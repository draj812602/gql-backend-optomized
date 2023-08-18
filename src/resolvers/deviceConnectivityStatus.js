/* eslint-disable camelcase */
const { pool } = require('../utils/db_connection')
const { PubSub } = require('apollo-server-express')
const isActivePubsub = new PubSub()
require('dotenv').config()
// get device connectivity status from event hub
const updateDeviceConnectionStatus = async (event) => {
  const eventType = JSON.stringify(event.body[0].eventType)
  let deviceId = JSON.stringify(event.body[0].data.deviceId)
  deviceId = deviceId.replace(/"/g, '')
  deviceId = addColonToMAC(deviceId).join(':')
  console.log(eventType, deviceId)
  let deviceStatus
  if (eventType === '"Microsoft.Devices.DeviceConnected"') {
    deviceStatus = true
  } else if (eventType === '"Microsoft.Devices.DeviceDisconnected"') {
    deviceStatus = false
  }
  const qstr1 = {
    text: 'select user_id from tbl_user_device_info where mac_address=$1',
    values: [deviceId]
  }
  const isDeviceExistAtUser = await pool.query(qstr1)
  if (isDeviceExistAtUser.rows.length > 0) {
    const { user_id } = isDeviceExistAtUser.rows[0]
    const qstr3 = {
      text: 'select email from tbl_user_info where user_id=$1',
      values: [user_id]
    }
    const { email } = (await pool.query(qstr3)).rows[0]
    const qstr2 = {
      text: 'update tbl_user_device_info set is_activated=$1 where mac_address=$2 RETURNING user_dev_id, user_id, mac_address, location, is_activated',
      values: [deviceStatus, deviceId]
    }
    const res = await pool.query(qstr2)
    if (res.rowCount === 1) {
      await publishDeviceActivatedData(res.rows[0], email)
      return true
    } else {
      return false
    }
  }
}

const addColonToMAC = (macWithoutColon) => {
  const addedColonMAC = []
  for (let i = 0, len = macWithoutColon.length; i < len - 1; i += 2) {
    addedColonMAC.push(macWithoutColon.substr(i, 2))
    // console.log(addedColonMAC);
  }
  return addedColonMAC
}

const publishDeviceActivatedData = async (res, email) => {
  const deviceActivated = {
    device_id: res.user_dev_id,
    device_name: res.mac_address,
    location: res.location,
    is_activated: res.is_activated
  }
  isActivePubsub.publish(`"isDeviceActivated/${email}"`, { isDeviceActivated: deviceActivated })
  // isActivePubsub.publish('isDeviceActivated', { isDeviceActivated: deviceActivated })
}

module.exports = { updateDeviceConnectionStatus: updateDeviceConnectionStatus, isActivePubsub: isActivePubsub }
