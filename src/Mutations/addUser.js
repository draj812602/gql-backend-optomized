/* eslint-disable camelcase */

const jwtDecode = require('jwt-decode')

const add_user_info = async (_, args, { pool, request }) => {
  try {
    // let {token}=args;
    const token = request.headers.authorization
    const token_decoded = jwtDecode(token)
    const user_name = token_decoded.name
    const email = token_decoded.emails[0]
    const created_at = new Date()
    const updated_at = new Date()
    const query1 = {
      text: 'SELECT * from tbl_user_info where email=$1',
      values: [email]
    }
    const res1 = await pool.query(query1)
    if (res1.rows.length <= 0) {
      const query = {
        text:
                    'INSERT INTO tbl_user_info(user_name,email,created_at,updated_at) VALUES ($1, $2, $3,$4)',
        values: [user_name, email, created_at, updated_at]
      }

      const res = await pool.query(query)
      // console.log("inserted res=",res);
      if (res) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  } catch (err) {
    return err
  }
}

module.exports = { add_user_info }
