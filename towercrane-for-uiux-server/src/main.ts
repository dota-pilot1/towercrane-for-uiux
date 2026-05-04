import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MeetingGateway } from './meeting/meeting.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'https://hibot-docu.com',
      'http://hibot-docu.com',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
  app.get(MeetingGateway).attach(app.getHttpServer());
}
void bootstrap();
