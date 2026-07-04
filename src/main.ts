import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Prefixo global /api
  app.setGlobalPrefix('api');
  
  // Habilitar CORS
  // Em produção exige lista explícita de origens: refletir qualquer origem
  // (origin: true) com credentials: true equivaleria a desabilitar a
  // proteção de CORS para todos os endpoints autenticados.
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
    throw new Error(
      'ALLOWED_ORIGINS não configurado. Defina os domínios do frontend antes de iniciar em produção.',
    );
  }
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
        origin.trim().replace(/\/+$/, ''),
      )
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
