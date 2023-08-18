/* eslint-disable no-tabs */
const config = require('../../utils/cosmosdb_config')
/*
// This script ensures that the database is setup and populated correctly
*/
async function create (client, databaseId, containerId) {
  const partitionKey = config.partitionKey

  /**
	 * Create the database if it does not exist
	 */
  await client.databases.createIfNotExists({
    id: databaseId
  })
  // console.log(`Created database:\n${database.id}\n`);

  /**
	 * Create the container if it does not exist
	 */
  await client
    .database(databaseId)
    .containers.createIfNotExists(
      { id: containerId, partitionKey },
      { offerThroughput: 400 }
    )

  // console.log(`Created container:\n${container.id}\n`);
}

module.exports = { create }
