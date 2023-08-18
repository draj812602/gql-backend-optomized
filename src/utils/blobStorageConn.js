/* eslint-disable no-tabs */
const {
  BlobServiceClient,
  StorageSharedKeyCredential
} = require('@azure/storage-blob')

const account = process.env.BLOB_STORAGE_ACOOUNT
const accountKey = process.env.BLOB_STORAGE_ACCOUNT_KEY
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)
const blobServiceClient = new BlobServiceClient(
	// When using AnonymousCredential, following url should include a valid SAS or support public access
	`https://${account}.blob.core.windows.net`,
	sharedKeyCredential
)

module.exports = blobServiceClient
