import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import { AuthGuard } from '../auth/auth.guard'
import { UploadService } from './upload.service'

const presignSchema = z.object({
  filename: z.string().min(1).max(256),
  contentType: z.string().min(1).max(128),
})

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign')
  async presign(@Body() body: unknown) {
    const parsed = presignSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues)
    }
    return this.uploadService.createPresignedPutUrl(
      parsed.data.filename,
      parsed.data.contentType,
    )
  }
}
