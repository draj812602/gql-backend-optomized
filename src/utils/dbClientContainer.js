const { CosmosClient } = require('@azure/cosmos')

const getDbClinetContainer = (config) => {
  const { databaseId, containerId, endpoint, key } = config
  const client = new CosmosClient({ endpoint, key })
  const database = client.database(databaseId)
  const container = database.container(containerId)
  return { client, database, container }
}

module.exports = { getDbClinetContainer }
