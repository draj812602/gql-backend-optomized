const { EventHubConsumerClient } = require('@azure/event-hubs')
// // Event Hub-compatible endpoint
// // az iot hub show --query properties.eventHubEndpoints.events.endpoint --name {your IoT Hub name}
// const eventHubsCompatibleEndpoint =
// 'sb://iothub-ns-winciothub-3753528-6c69e4b602.servicebus.windows.net'

// // Event Hub-compatible name
// // az iot hub show --query properties.eventHubEndpoints.events.path --name {your IoT Hub name}
// const eventHubsCompatiblePath = 'winciothub1'

// // Primary key for the "service" policy to read messages
// // az iot hub policy show --name service --query primaryKey --hub-name {your IoT Hub name}
// const iotHubSasKey = '03yIT5yYLWt//78uMOoYJMw5HD9zuM+xLkglPq5gu5Y='

const connectionString = process.env.BUILTIN_EVENT_HUB_CONN_STR
const consumerGroup = process.env.BUILTIN_EVENT_HUB_CONSUMER_GROUP
// const consumerClient = new EventHubConsumerClient("winc-solution-consumer-group", connectionString);
const consumerClient = new EventHubConsumerClient(consumerGroup, connectionString)

module.exports = consumerClient
