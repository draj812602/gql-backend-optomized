const jwt = require('jsonwebtoken')
require('dotenv').config()

const checkAuth = (authoToken) => {
  if (authoToken) {
    try {
      const user = jwt.verify(authoToken, process.env.PUBSUB_JWT_TOKEN_SECRET)
      return user
    } catch (error) {
      throw new Error('Invalid connection token')
    }
  }
}

module.exports = { checkAuth }
