import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DevManagementGateway } from './dev-management/dev-management.gateway';
import { MeetingGateway } from './meeting/meeting.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175',
      'http://localhost:5176',
      'http://127.0.0.1:5176',
      'https://hibot-docu.com',
      'http://hibot-docu.com',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
  app.get(MeetingGateway).attach(app.getHttpServer());
  app.get(DevManagementGateway).attach(app.getHttpServer());
}
void bootstrap();
