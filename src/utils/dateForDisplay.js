/* eslint-disable camelcase */

const dateForDisplay = async (convRecordedTime) => {
  const splitDate = convRecordedTime.split(',')
  // const date = splitDate[0].split('/')
  let date = splitDate[0]
  // const newdate = `${date[1]}/${date[0]}/${date[2]}`
  const month = new Date(date).toLocaleString('en-GB', { month: 'long' })
  date = date.split('/')
  const final_date = `${month}.${date[1]}.${date[2]}` + ' ' + splitDate[1]
  return final_date
}
module.exports = { dateForDisplay }
