const { Pool, Client } = require('pg')

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.port,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 0
})
const client = new Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.port,
  idleTimeoutMillis: 0
  // connectionTimeoutMillis: 0,
})

// client.on('error', err => {
//   // console.error('something bad has happened!', err.stack)
//   console.error('something bad has happened.........!', err)
//   // process.exit(-1)
//   client.end()
//   client = new Client({
//     user: process.env.USER,
//     host: process.env.HOST,
//     database: process.env.DATABASE,
//     password: process.env.PASSWORD,
//     port: process.env.port,
//     idleTimeoutMillis: 0,
//     connectionTimeoutMillis: 0
//   })
//   client.connect()
// })

module.exports = { pool, client }
