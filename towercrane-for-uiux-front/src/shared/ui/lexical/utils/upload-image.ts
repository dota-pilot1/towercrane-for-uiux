import { apiRequest } from '../../../api/http'

type PresignedUrlResponse = {
  presignedUrl: string
  publicUrl: string
  key: string
}

export async function uploadImageToS3(file: File): Promise<string> {
  const { presignedUrl, publicUrl } = await apiRequest<PresignedUrlResponse>(
    '/upload/presign',
    {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    },
  )

  const putResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!putResponse.ok) {
    throw new Error(`S3 upload failed: ${putResponse.status}`)
  }

  return publicUrl
}
