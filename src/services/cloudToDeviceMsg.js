/* eslint-disable camelcase */
const Client = require('azure-iothub').Client
// c2d message sending through direct method
const sendCloudToDeviceMsg = async (target_device, method_name, method_timeout, connection_timeout, init_value) => {
  try {
    const connString = process.env.IOTHUB_CONN_STRING
    const serviceClient = Client.fromConnectionString(connString)
    const methodParams = {
      methodName: method_name,
      payload: init_value,
      responseTimeoutInSeconds: method_timeout,
      connectTimeoutInSeconds: connection_timeout
    }
    // console.log("methodParams=",methodParams," target_device=",target_device)
    return await new Promise((resolve, reject) => {
      serviceClient.invokeDeviceMethod(target_device, methodParams, function (err, result) {
        if (err) {
          console.error('Failed to invoke method \'' + methodParams.methodName + '\': ' + err)
          const statusCode = err.response.statusCode
          console.log('error=', err.response)
          const res = { code: statusCode, msg: err }
          resolve(res)
        } else {
          console.log(JSON.stringify(result, null, 2))
          const statusCode = result.status
          const res = { code: statusCode, msg: result }
          resolve(res)
        }
      })
    })
  } catch (err) {
    return err
  }
}

module.exports = {
  sendCloudToDeviceMsg: sendCloudToDeviceMsg
}
