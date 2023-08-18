/* eslint-disable camelcase */

const dateFormatForSensorPower = async (updatedTime) => {
  const updatedat = (updatedTime).split(',')
  let date = updatedat[0]
  const month = new Date(date).toLocaleString('en-GB', { month: 'long' })
  date = date.split('/')
  date = `${month}.${date[1]}.${date[2]}`
  const new_updated_at = `${date}` + ' ' + `${updatedat[1]}`
  return new_updated_at
}

module.exports = dateFormatForSensorPower
