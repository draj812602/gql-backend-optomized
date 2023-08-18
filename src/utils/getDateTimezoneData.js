/* eslint-disable array-callback-return */
const { getDeviceTimeZone } = require('./getDeviceTimeZone')

const getDateTimeBasedOnCounty = async (pool, userCountrycode, datetime) => {
  try {
    const timezoneval = await getDeviceTimeZone(pool, userCountrycode)
    console.log('before datetime=', datetime)
    datetime = new Date(datetime).toLocaleString('en-GB',
      { hour12: false, timeZone: timezoneval },
      { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    )
    console.log('after datetime=', datetime)
    // const splitdatetime = datetime.split(',')
    // const splitdate = splitdatetime[0].split('/')
    // const date = `${splitdate[1]}/${splitdate[0]}/${splitdate[2]}`
    // datetime = `${date}, ${splitdatetime[1]}`
    return { formattedDate: datetime }
  } catch (error) {
    return error
  }
}

module.exports = { getDateTimeBasedOnCounty }
