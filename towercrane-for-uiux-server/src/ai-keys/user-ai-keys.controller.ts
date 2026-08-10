import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import { aiProviderSchema, saveAiKeySchema } from './user-ai-keys.schemas';
import { UserAiKeysService } from './user-ai-keys.service';

@Controller('user/ai-keys')
@UseGuards(SessionGuard)
export class UserAiKeysController {
  constructor(private readonly service: UserAiKeysService) {}

  @Get()
  list(@Req() req: SessionRequest) { return this.service.list(req.user.id); }

  @Put(':provider')
  save(@Req() req: SessionRequest, @Param('provider') provider: string, @Body() body: unknown) {
    return this.service.save(req.user.id, aiProviderSchema.parse(provider), saveAiKeySchema.parse(body));
  }

  @Delete(':provider')
  remove(@Req() req: SessionRequest, @Param('provider') provider: string) {
    return this.service.remove(req.user.id, aiProviderSchema.parse(provider));
  }

  @Post(':provider/test')
  test(@Req() req: SessionRequest, @Param('provider') provider: string) {
    return this.service.test(req.user.id, aiProviderSchema.parse(provider));
  }
}
