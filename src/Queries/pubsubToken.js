/* eslint-disable camelcase */
const { getPubsubJwtToken } = require('../utils/getPubsubAuthToken')
const { get_user_id } = require('../utils/getUserId')

const getPubsubToken = async (_, args, { pool, request }) => {
  try {
    const pubsubToken = {
      token: null
    }
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new Error('Unauthorized User')
    } else {
      const authToken = getPubsubJwtToken()
      pubsubToken.token = authToken
      return pubsubToken
    }
  } catch (err) {
    console.log('Error is :', err)
    return err
  }
}

module.exports = { getPubsubToken }
