const jwt = require('jsonwebtoken')
const uuid = require('uuid')
require('dotenv').config()

const id = uuid.v4()
const getPubsubJwtToken = () => {
  const token = jwt.sign({
    id: id
  }, process.env.PUBSUB_JWT_TOKEN_SECRET)

  return token
}
// const getJwtToken = () => {

//     const token = jwt.sign({
//         id: id
//     }, process.env.PUBSUB_JWT_TOKEN_SECRET, { expiresIn: "1d" })

//     return token
// }
module.exports = { getPubsubJwtToken }
