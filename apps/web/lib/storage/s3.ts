import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter } from './index'

export function createS3Adapter(): StorageAdapter {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.GPX_STORAGE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.GPX_STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.GPX_STORAGE_SECRET_KEY!,
    },
  })
  const bucket = process.env.GPX_STORAGE_BUCKET!

  return {
    async upload(key, data, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType })
      )
      return `https://${process.env.GPX_STORAGE_PUBLIC_DOMAIN}/${key}`
    },
  }
}
