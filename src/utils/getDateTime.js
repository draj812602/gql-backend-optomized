
const getDatetime = async (timezone) => {
  // const dateFormat = new Date().toLocaleDateString('en-GB', {
  //   day: '2-digit', month: '2-digit', year: 'numeric'
  // })
  const d = new Date()
  const dateFormat = d.toLocaleString('en-GB', { hour12: false, timeZone: timezone }, { hour: '2-digit', minute: '2-digit', second: '2-digit' }
  )
  // const splitdatetime = dateFormat.split(',')
  // const splitdate = splitdatetime[0].split('/')
  // const date = `${splitdate[1]}/${splitdate[0]}/${splitdate[2]}`
  // const formattedDate = `${date}, ${splitdatetime[1]}`
  return { formattedDate: dateFormat }
}

module.exports = { getDatetime }
