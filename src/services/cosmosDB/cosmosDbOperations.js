/* eslint-disable camelcase */
const CosmosClient = require('@azure/cosmos').CosmosClient

const dbContext = require('./cosmosdbContext')
const config = require('../../utils/cosmosdb_config').config

const { endpoint, key, databaseId, containerId } = config
const client = new CosmosClient({ endpoint, key })
const database = client.database(databaseId)
const container = database.container(containerId)
const updateDeviceLocation = async (mac_address, deviceLocation) => {
  try {
    const device_id = mac_address.replace(/:/g, '')

    await dbContext.create(client, databaseId, containerId)

    const querySpec1 = {
      query: `SELECT * from c where c.deviceId='${device_id}'`
    }
    const { resources: items } = await container.items
      .query(querySpec1)
      .fetchAll()
    const { id, deviceId } = items[0]

    const device_hw_info = {
      deviceManufacturer: items[0].device_twin.tags.device_hw_info.deviceManufacturer,
      deviceCategory: items[0].device_twin.tags.device_hw_info.deviceCategory,
      deviceType: items[0].device_twin.tags.device_hw_info.deviceType,
      hwVersion: items[0].device_twin.tags.device_hw_info.hwVersion,
      deviceLocation: deviceLocation
    }

    items[0].device_twin.tags.device_hw_info = device_hw_info

    // const { resource: updatedItem }
    const { resource: updatedItem } = await container
      .item(id, deviceId)
      .replace(items[0])
    console.log(`Updated item: ${updatedItem.id} - ${updatedItem.deviceId}`)
    return await new Promise((resolve) => {
      resolve(updatedItem.deviceId)
    })
  } catch (err) {
    return (err)
  }
  // })
}

const getDeviceTwinUserPropers = async (mac_address) => {
  // await dbContext.create(client, databaseId, containerId);
  try {
    const device_id = mac_address.replace(/:/g, '')
    const querySpec1 = {
      query: `SELECT * from c where c.deviceId='${device_id}'`
    }
    const { resources: items } = await container.items
      .query(querySpec1)
      .fetchAll()

    const gpio0 = items[0].device_twin.properties.desired.UserDefinedProperty.GPIO0
    const gpio1 = items[0].device_twin.properties.desired.UserDefinedProperty.GPIO1
    const location = items[0].device_twin.tags.deviceInfo.deviceLocation
    const dateTime = items[0].device_twin.properties.desired.metadata.$lastUpdated
    const last_updated_at = await convertDateTime(dateTime)
    const userDefinedPropers = [{
      location: location,
      gpio0: gpio0,
      gpio1: gpio1,
      last_updated_at: last_updated_at
    }]
    // console.log("userDefinedPropers",userDefinedPropers);
    return userDefinedPropers
  } catch (err) {
    return err
  }
}

const convertDateTime = async (dateTime) => {
  const date1 = dateTime.split('T')
  const d = new Date(date1[0])
  const t = date1[1].substr(0, 5)
  const last_upated_at = d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear() + ' ' + t
  return last_upated_at
}

module.exports = {
  updateDeviceLocation: updateDeviceLocation,
  getDeviceTwinUserPropers: getDeviceTwinUserPropers
}
