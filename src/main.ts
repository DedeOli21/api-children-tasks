import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Prefixo global /api
  app.setGlobalPrefix('api');
  
  // Habilitar CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : true; // Em desenvolvimento, permite todas as origens
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  
  console.log(`🚀 API rodando em http://${host}:${port}`);
  console.log(`📚 Recursos: /api/auth, /api/children, /api/teacher, /api/stars,`);
  console.log(`   /api/tasks, /api/penalties, /api/rewards, /api/routines,`);
  console.log(`   /api/history, /api/streaks, /api/mystery-box`);
}

bootstrap();
