import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client } from '@aws-sdk/client-s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

export type PresignedUrlResponse = {
  presignedUrl: string
  publicUrl: string
  key: string
}

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client
  private readonly bucket: string
  private readonly region: string

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = configService.get<string>('AWS_ACCESS_KEY_ID')
    const secretAccessKey = configService.get<string>('AWS_SECRET_ACCESS_KEY')
    const region = configService.get<string>('AWS_S3_REGION')
    const bucket = configService.get<string>('AWS_S3_BUCKET_NAME')

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      throw new InternalServerErrorException(
        'AWS S3 환경변수가 설정되지 않았습니다 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_REGION, AWS_S3_BUCKET_NAME).',
      )
    }

    this.region = region
    this.bucket = bucket
    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async createPresignedPutUrl(
    filename: string,
    contentType: string,
  ): Promise<PresignedUrlResponse> {
    const safeName = filename.replace(/[^\w.\-]/g, '_')
    const key = `towercrane-docu/${randomUUID()}-${safeName}`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
    })

    const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`

    return { presignedUrl, publicUrl, key }
  }
}
