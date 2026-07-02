import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';

// Storage "furado": nunca acumula hits, então o ThrottlerGuard nunca bloqueia.
// O guard em si é registrado como APP_GUARD (não dá para usar overrideGuard
// nesse caso), então a forma limpa de neutralizá-lo em teste é pela storage.
class NoopThrottlerStorage implements ThrottlerStorage {
  increment() {
    return Promise.resolve({
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  }
}

// Cada chamada cria uma aplicação Nest completa (guards, pipes, TypeORM real)
// contra um SQLite isolado em memória (ver test/setup-env.ts). O throttler é
// desligado para não derrubar suítes que registram vários usuários seguidos.
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerStorage)
    .useClass(NoopThrottlerStorage)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
