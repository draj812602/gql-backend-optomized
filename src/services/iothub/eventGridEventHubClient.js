
const { EventHubConsumerClient } = require('@azure/event-hubs')
const connString = process.env.EVENT_HUB_NAME_SPACE_CONNSTR
const eventHubName = process.env.EVENT_HUB_NAME
const consumerGroup = process.env.EVENT_HUB_CONSUMER_GROUP

// Create a consumer client for the event hub .
const eventGridConsumerClient = new EventHubConsumerClient(consumerGroup, connString, eventHubName)

module.exports = eventGridConsumerClient
