/* eslint-disable camelcase */
/** @format */

const jwt = require('jsonwebtoken')
const TOKEN_SECRET = '/KCg4Eq~E8(~$<mP'
const getJwtToken = (user_details) => {
  const { user_id, disp_name, user_type_id, email } = user_details

  const token = jwt.sign(
    {
      user_id,
      disp_name,
      user_type_id,
      email
    },
    TOKEN_SECRET,
    { expiresIn: '55555d' }
  )

  return token
}
module.exports = { getJwtToken }
