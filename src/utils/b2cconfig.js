/* eslint-disable no-tabs */
require('dotenv').config()

/**
 * wiznetwink_webapi ==> web api
 * wiznetwink_webapp ==> webapp
 *
 */
const clientID = '19135152-9597-45ff-85dc-65d6c0aad52d' // Application (client) ID of your API's application registration
const b2cDomainHost = 'wiznetwink.b2clogin.com'
const tenantId = '103fb4cb-1709-4f25-bc91-eb4a62eb73f8' // Alternatively, you can use your Directory (tenant) ID (a GUID)
const policyName = 'B2C_1_SignupSignin'

// const clientID = process.env.CLIENTID; // Application (client) ID of your API's application registration
// const b2cDomainHost = process.env.B2CDOMAINHOST;
// const tenantId = process.env.TENANTID; // Alternatively, you can use your Directory (tenant) ID (a GUID)
// const policyName = process.env.POLICYNAME;

const b2cconfig = {
  identityMetadata:
		'https://' +
		b2cDomainHost +
		'/' +
		tenantId +
		'/' +
		policyName +
		'/v2.0/.well-known/openid-configuration/',
  clientID: clientID,
  policyName: policyName,
  isB2C: true,
  validateIssuer: false,
  loggingLevel: 'info',
  loggingNoPII: false,
  passReqToCallback: false
}
module.exports = b2cconfig
