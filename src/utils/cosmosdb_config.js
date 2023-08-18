/* eslint-disable camelcase */
const config = {
  endpoint: process.env.COSMOSDB_ENDPOINT,
  key: process.env.COSMOSDB_KEY,
  databaseId: process.env.COSMOSDB_NAME,
  containerId: process.env.CONTAINER_ID_1,
  partitionKey: { kind: 'Hash', paths: ['/deviceId'] }
}
const config2 = {
  endpoint: process.env.COSMOSDB_ENDPOINT,
  key: process.env.COSMOSDB_KEY,
  databaseId: process.env.COSMOSDB_NAME,
  containerId: process.env.CONTAINER_ID_2,
  partitionKey: { kind: 'Hash', paths: ['/groupName'] }
}

// ! Firmware cosmosdb config
const config_firmware = {
  endpoint: process.env.ENDPOINT_FIRMWARE,
  key: process.env.KEY_FIRMWARE,
  databaseId: process.env.DATABASEID_FIRMWARE,
  containerId: process.env.CONTAINERID_FIRMWARE,
  partitionKey: { kind: 'Hash', paths: ['/version'] }
  // partitionKey: "user_role"
}

module.exports = { config, config2, config_firmware }
