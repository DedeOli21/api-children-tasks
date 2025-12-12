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
  console.log(`📚 Endpoints disponíveis:`);
  console.log(`   POST   /api/auth/register - Registrar usuário`);
  console.log(`   POST   /api/auth/login - Login`);
  console.log(`   GET    /api/auth/profile - Perfil do usuário`);
  console.log(`   GET    /api/stars - Saldo de estrelas`);
  console.log(`   PATCH  /api/stars/add - Adicionar estrelas`);
  console.log(`   PATCH  /api/stars/subtract - Subtrair estrelas`);
  console.log(`   GET    /api/tasks - Listar tarefas`);
  console.log(`   POST   /api/tasks - Criar tarefa`);
  console.log(`   PATCH  /api/tasks/:id - Atualizar tarefa`);
  console.log(`   DELETE /api/tasks/:id - Deletar tarefa`);
  console.log(`   PATCH  /api/tasks/:id/complete - Completar tarefa`);
  console.log(`   PATCH  /api/tasks/:id/uncomplete - Desmarcar tarefa`);
  console.log(`   POST   /api/tasks/reset - Resetar tarefas do dia`);
  console.log(`   GET    /api/penalties - Listar penalidades`);
  console.log(`   POST   /api/penalties - Criar penalidade`);
  console.log(`   PATCH  /api/penalties/:id - Atualizar penalidade`);
  console.log(`   DELETE /api/penalties/:id - Deletar penalidade`);
  console.log(`   POST   /api/penalties/apply - Aplicar penalidade`);
  console.log(`   GET    /api/rewards - Listar recompensas`);
  console.log(`   POST   /api/rewards - Criar recompensa`);
  console.log(`   POST   /api/rewards/:id/redeem - Resgatar recompensa`);
  console.log(`   GET    /api/history - Histórico`);
  console.log(`   GET    /api/history/statistics - Estatísticas`);
  console.log(`   GET    /api/routines - Listar rotinas`);
  console.log(`   GET    /api/routines/:id - Detalhes da rotina`);
  console.log(`   POST   /api/routines - Criar rotina`);
  console.log(`   PATCH  /api/routines/:id - Atualizar rotina`);
  console.log(`   DELETE /api/routines/:id - Remover rotina`);
  console.log(`   POST   /api/routines/:id/tasks/:taskId - Adicionar tarefa à rotina`);
  console.log(`   DELETE /api/routines/:id/tasks/:taskId - Remover tarefa da rotina`);
  console.log(`   GET    /api/streaks - Obter streak atual`);
  console.log(`   GET    /api/mystery-box - Obter configuração da caixa`);
  console.log(`   POST   /api/mystery-box/open - Abrir caixa surpresa`);
  console.log(`   GET    /api/mystery-box/prizes - Listar prêmios (admin)`);
  console.log(`   POST   /api/mystery-box/prizes - Criar prêmio (admin)`);
  console.log(`   PATCH  /api/mystery-box/prizes/:id - Atualizar prêmio (admin)`);
  console.log(`   DELETE /api/mystery-box/prizes/:id - Deletar prêmio (admin)`);
}

bootstrap();
