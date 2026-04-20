import { apiRequest } from './http'

export type PresignResponse = {
  presignedUrl: string
  key: string
  publicUrl: string
}

function assertPresignResponse(
  response: Partial<PresignResponse>,
): asserts response is PresignResponse {
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

export async function uploadFile(file: File): Promise<string> {
  // 1. Get presigned URL
  const presign = await apiRequest<Partial<PresignResponse>>('/upload/presign', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  })
  assertPresignResponse(presign)

  const { presignedUrl, publicUrl } = presign

  // 2. Upload to S3 directly
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`)
  }

  return publicUrl
}
