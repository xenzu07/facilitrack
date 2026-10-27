import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // photos are reachable at http://<host>:3000/uploads/<filename>
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  await app.listen(3000, '0.0.0.0');
}
bootstrap();