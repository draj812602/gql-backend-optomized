const { Pool, Client } = require('pg')

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.port
  // keepAlive: true,
  // idleTimeoutMillis: 0,
  // connectionTimeoutMillis: 0,
})
const client = new Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.port
  // keepAlive: true,
  // idleTimeoutMillis: 0,
  // connectionTimeoutMillis: 0,
})

module.exports = { pool, client }
