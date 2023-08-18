/* eslint-disable array-callback-return */
const getDeviceTimeZone = async (pool, userCountrycode) => {
  let timezoneval = null
  const timeZoneQry = {
    text: 'SELECT country_timezone FROM all_timezone_codes WHERE code=$1',
    values: [userCountrycode]
  }
  // const timeZonee = (await pool.query(timeZoneQry)).rows[0].country_timezone
  const timeZoneRes = await pool.query(timeZoneQry)
  timeZoneRes.rows.map(data => {
    timezoneval = data.country_timezone
  })
  return timezoneval
}

module.exports = { getDeviceTimeZone }
