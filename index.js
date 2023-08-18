// ! Library package imports
const express = require('express')
const http = require('http')
// const bodyParser = require('body-parser')
const passport = require('passport')
const { ApolloServer } = require('apollo-server-express')
const cors = require('cors')
const BearerStrategy = require('passport-azure-ad').BearerStrategy
require('dotenv').config()
// const helmet = require('helmet')
// ! Files imports
const { pool } = require('./src/utils/db_connection')
const typeDefs = require('./src/schema/schema')
const resolvers = require('./src/resolvers/resolvers')
const b2cconfig = require('./src/utils/b2cconfig')
// const iothubSubscriber = require("./src/services/iothub/iothubSubscriber");
const consumerClient = require('./src/services/iothub/eventHubClient')
const eventGridConsumerClient = require('./src/services/iothub/eventGridEventHubClient')
const { checkAuth } = require('./src/utils/checkAuth')
const { eventSubscriber } = require('./src/resolvers/dataPublisher')
const { updateDeviceConnectionStatus } = require('./src/resolvers/deviceConnectivityStatus')
// const { NoIntrospection } = require('./src/utils/validationRules')
const app = express()
const PORT = 8080
// app.use(helmet())
// enable CORS using npm package
app.use(cors())

// ! subscribe to IoT hub built-in entpoint
consumerClient.subscribe({
  processEvents: async (messages) => {
    if (messages.length > 0) {
      for (const message of messages) {
        console.log(message.body)
        await eventSubscriber(message)
      }
    }
  },
  processError: (_err) => {
    // console.log(err.message)
  }
})

const subscriptionOptions = {
  maxWaitTimeInSeconds: 10
}
// subscribe to eventHub to record device Connectivity status
eventGridConsumerClient.subscribe({
  processEvents: async (events, context) => {
    for (const event of events) {
      const obj = JSON.stringify(event.body)
      console.log(`Received event: ${obj} from partition: '${context.partitionId}' and consumer group: '${context.consumerGroup}'`)
      await updateDeviceConnectionStatus(event)
    }
  },

  processError: async (_err, context) => {
    // console.log(`Error : ${err}`)
  },
  subscriptionOptions
}
)

// !  B2C Authentication using Passport
const bearerStrategy = new BearerStrategy(b2cconfig, function (token, done) {
  done(null, {}, token)
})

app.use('/graphql')
app.use(passport.initialize())
passport.use(bearerStrategy)
app.use(passport.authenticate('oauth-bearer', { session: false }))

// ! The function that sets up the global context for each resolver, using the req
// const context = async ({ req }) => {
//     const request = req
//     return { request, pool, client };
// };
const context = async ({ req, connection }) => {
  if (req) {
    const request = req
    return { request, pool }
  } else {
    const authToken = connection.context.authToken
    if (typeof authToken !== 'undefined') {
      checkAuth(authToken)
      console.log('Websocket Authentication Successful!')
      return { pool }
    } else {
      throw new Error('Token type must be authToken')
    }
  }
}

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context //,
  // introspection: false,
  // playground: false

})

apolloServer.applyMiddleware({ app })

const httpServer = http.createServer(app)
apolloServer.installSubscriptionHandlers(httpServer)

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`)
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${apolloServer.subscriptionsPath}`)
})
