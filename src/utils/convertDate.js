//! dd/mm/yyyy
const convert = (str) => {
  const date = new Date(str)
  const mnth = ('0' + (date.getMonth() + 1)).slice(-2)
  const day = ('0' + date.getDate()).slice(-2)
  return [day, mnth, date.getFullYear()].join('-')
}

//! yyyy/mm/dd
const convertReverseFormat = (str) => {
  const date = new Date(str)
  const mnth = ('0' + (date.getMonth() + 1)).slice(-2)
  const day = ('0' + date.getDate()).slice(-2)
  // return [day, mnth, date.getFullYear()].join("-");
  return [date.getFullYear(), mnth, day].join('-')
}

module.exports = { convert, convertReverseFormat }
