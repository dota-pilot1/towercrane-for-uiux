import { apiRequest } from '../../../api/http'

type PresignedUrlResponse = {
  presignedUrl: string
  publicUrl: string
  key: string
}

function assertPresignResponse(
  response: Partial<PresignedUrlResponse>,
): asserts response is PresignedUrlResponse {
  if (
    typeof response.presignedUrl !== 'string' ||
    response.presignedUrl.length === 0
  ) {
    throw new Error(
      'Upload presign response is invalid: presignedUrl is missing.',
    )
  }

  if (typeof response.publicUrl !== 'string' || response.publicUrl.length === 0) {
    throw new Error(
      'Upload presign response is invalid: publicUrl is missing.',
    )
  }
}

export async function uploadImageToS3(file: File): Promise<string> {
  const response = await apiRequest<Partial<PresignedUrlResponse>>(
    '/upload/presign',
    {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    },
  )
  assertPresignResponse(response)

  const { presignedUrl, publicUrl } = response

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
