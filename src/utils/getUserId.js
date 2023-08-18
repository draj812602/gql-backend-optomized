/* eslint-disable array-callback-return */
/* eslint-disable camelcase */
const jwtDecode = require('jwt-decode')

const get_user_id = async (token, pool) => {
  try {
    // let token = request.headers.authorization;
    const token_decoded = jwtDecode(token)
    const user_email = token_decoded.emails[0]
    // const query1 = {
    //     text: `select user_id from tbl_user_info WHERE email=$1`,
    //     values: [user_email],
    // };
    const query1 = `select user_id from tbl_user_info WHERE email='${user_email}'`
    let user_id
    const userid = await pool.query(query1)
    if (userid.rows.length > 0) {
      userid.rows.map((data) => {
        user_id = data.user_id
      })
      return { user_id: user_id, email: user_email }
      // return user_id;
    } else {
      return { user_id: null }
    }
  } catch (err) {
    return err
  }
}

module.exports = { get_user_id }
