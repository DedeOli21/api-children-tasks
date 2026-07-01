import 'dotenv/config';
import { DataSource } from 'typeorm';
import BetterSqlite3 from 'better-sqlite3';
import {
  User,
  Task,
  DailyLog,
  Penalty,
  Reward,
  HistoryEntry,
  Routine,
  RoutineLog,
  MysteryPrize,
} from '../entities';

// Configuração do SQLite (origem)
const sqlitePath = process.env.DATABASE_PATH || 'database.sqlite';
const sqliteDb = BetterSqlite3(sqlitePath);

// Configuração do PostgreSQL (destino)
const postgresDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Task, DailyLog, Penalty, Reward, HistoryEntry, Routine, RoutineLog, MysteryPrize],
  synchronize: false, // Não usar synchronize em produção
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface MigrationStats {
  users: number;
  tasks: number;
  dailyLogs: number;
  penalties: number;
  rewards: number;
  historyEntries: number;
  routines: number;
  routineLogs: number;
  mysteryPrizes: number;
  routineTasks: number;
}

async function migrate() {
  console.log('🚀 Iniciando migração do SQLite para PostgreSQL...\n');

  // Verificar se o DATABASE_URL está configurado
  if (!process.env.DATABASE_URL) {
    console.error('❌ Erro: DATABASE_URL não está configurado!');
    console.log('💡 Configure a variável DATABASE_URL com a URL do PostgreSQL do Render');
    process.exit(1);
  }

  try {
    // Conectar ao PostgreSQL
    console.log('📡 Conectando ao PostgreSQL...');
    await postgresDataSource.initialize();
    console.log('✅ Conectado ao PostgreSQL\n');

    // Criar as tabelas no PostgreSQL (usando synchronize apenas para migração)
    console.log('📋 Criando estrutura das tabelas no PostgreSQL...');
    const tempDataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Task, DailyLog, Penalty, Reward, HistoryEntry, Routine, RoutineLog, MysteryPrize],
      synchronize: true, // Criar tabelas
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    await tempDataSource.initialize();
    await tempDataSource.destroy();
    console.log('✅ Estrutura criada\n');

    const stats: MigrationStats = {
      users: 0,
      tasks: 0,
      dailyLogs: 0,
      penalties: 0,
      rewards: 0,
      historyEntries: 0,
      routines: 0,
      routineLogs: 0,
      mysteryPrizes: 0,
      routineTasks: 0,
    };

    // 1. Migrar Users
    console.log('👤 Migrando usuários...');
    const users = sqliteDb.prepare('SELECT * FROM users').all() as any[];
    if (users.length > 0) {
      const userRepo = postgresDataSource.getRepository(User);
      for (const user of users) {
        // Verificar se o usuário já existe
        const existing = await userRepo.findOne({ where: { id: user.id } });
        if (!existing) {
          await userRepo.save({
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role,
            currentStars: user.current_stars || 0,
            currentStreak: user.current_streak || 0,
            lastStreakDate: user.last_streak_date || null,
            createdAt: user.created_at ? new Date(user.created_at) : new Date(),
            updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
          });
          stats.users++;
        }
      }
    }
    console.log(`✅ ${stats.users} usuários migrados\n`);

    // 2. Migrar Tasks
    console.log('📝 Migrando tarefas...');
    const tasks = sqliteDb.prepare('SELECT * FROM tasks').all() as any[];
    if (tasks.length > 0) {
      const taskRepo = postgresDataSource.getRepository(Task);
      for (const task of tasks) {
        const existing = await taskRepo.findOne({ where: { id: task.id } });
        if (!existing) {
          await taskRepo.save({
            id: task.id,
            title: task.title,
            iconEmoji: task.icon_emoji,
            active: task.active !== 0,
            createdAt: task.created_at ? new Date(task.created_at) : new Date(),
            updatedAt: task.updated_at ? new Date(task.updated_at) : new Date(),
          });
          stats.tasks++;
        }
      }
    }
    console.log(`✅ ${stats.tasks} tarefas migradas\n`);

    // 3. Migrar Penalties
    console.log('⚠️ Migrando penalidades...');
    const penalties = sqliteDb.prepare('SELECT * FROM penalties').all() as any[];
    if (penalties.length > 0) {
      const penaltyRepo = postgresDataSource.getRepository(Penalty);
      for (const penalty of penalties) {
        const existing = await penaltyRepo.findOne({ where: { id: penalty.id } });
        if (!existing) {
          await penaltyRepo.save({
            id: penalty.id,
            title: penalty.title,
            emoji: penalty.emoji,
            amount: penalty.amount || 1,
            active: penalty.active !== 0,
            createdAt: penalty.created_at ? new Date(penalty.created_at) : new Date(),
            updatedAt: penalty.updated_at ? new Date(penalty.updated_at) : new Date(),
          });
          stats.penalties++;
        }
      }
    }
    console.log(`✅ ${stats.penalties} penalidades migradas\n`);

    // 4. Migrar Rewards
    console.log('🎁 Migrando recompensas...');
    const rewards = sqliteDb.prepare('SELECT * FROM rewards').all() as any[];
    if (rewards.length > 0) {
      const rewardRepo = postgresDataSource.getRepository(Reward);
      for (const reward of rewards) {
        const existing = await rewardRepo.findOne({ where: { id: reward.id } });
        if (!existing) {
          await rewardRepo.save({
            id: reward.id,
            title: reward.title,
            emoji: reward.emoji,
            cost: reward.cost || 10,
            active: reward.active !== 0,
            createdAt: reward.created_at ? new Date(reward.created_at) : new Date(),
            updatedAt: reward.updated_at ? new Date(reward.updated_at) : new Date(),
          });
          stats.rewards++;
        }
      }
    }
    console.log(`✅ ${stats.rewards} recompensas migradas\n`);

    // 5. Migrar DailyLogs
    console.log('📅 Migrando logs diários...');
    const dailyLogs = sqliteDb.prepare('SELECT * FROM daily_logs').all() as any[];
    if (dailyLogs.length > 0) {
      const dailyLogRepo = postgresDataSource.getRepository(DailyLog);
      for (const log of dailyLogs) {
        const existing = await dailyLogRepo.findOne({ where: { id: log.id } });
        if (!existing) {
          await dailyLogRepo.save({
            id: log.id,
            userId: log.user_id,
            taskId: log.task_id,
            date: log.date,
            completed: log.completed !== 0,
            createdAt: log.created_at ? new Date(log.created_at) : new Date(),
          });
          stats.dailyLogs++;
        }
      }
    }
    console.log(`✅ ${stats.dailyLogs} logs diários migrados\n`);

    // 6. Migrar HistoryEntries
    console.log('📜 Migrando histórico...');
    const historyEntries = sqliteDb.prepare('SELECT * FROM history_entries').all() as any[];
    if (historyEntries.length > 0) {
      const historyRepo = postgresDataSource.getRepository(HistoryEntry);
      for (const entry of historyEntries) {
        const existing = await historyRepo.findOne({ where: { id: entry.id } });
        if (!existing) {
          await historyRepo.save({
            id: entry.id,
            userId: entry.user_id,
            type: entry.type,
            description: entry.description,
            starsChange: entry.stars_change || 0,
            createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
          });
          stats.historyEntries++;
        }
      }
    }
    console.log(`✅ ${stats.historyEntries} entradas de histórico migradas\n`);

    // 7. Migrar Routines
    console.log('🔄 Migrando rotinas...');
    const routines = sqliteDb.prepare('SELECT * FROM routines').all() as any[];
    if (routines.length > 0) {
      const routineRepo = postgresDataSource.getRepository(Routine);
      for (const routine of routines) {
        const existing = await routineRepo.findOne({ where: { id: routine.id } });
        if (!existing) {
          await routineRepo.save({
            id: routine.id,
            name: routine.name,
            description: routine.description || null,
            emoji: routine.emoji,
            timeOfDay: routine.time_of_day || null,
            active: routine.active !== 0,
            sortOrder: routine.sort_order || 0,
            scheduledTime: routine.scheduled_time || null,
            createdAt: routine.created_at ? new Date(routine.created_at) : new Date(),
            updatedAt: routine.updated_at ? new Date(routine.updated_at) : new Date(),
          });
          stats.routines++;
        }
      }
    }
    console.log(`✅ ${stats.routines} rotinas migradas\n`);

    // 8. Migrar RoutineLogs
    console.log('📋 Migrando logs de rotinas...');
    const routineLogs = sqliteDb.prepare('SELECT * FROM routine_logs').all() as any[];
    if (routineLogs.length > 0) {
      const routineLogRepo = postgresDataSource.getRepository(RoutineLog);
      for (const log of routineLogs) {
        const existing = await routineLogRepo.findOne({ where: { id: log.id } });
        if (!existing) {
          await routineLogRepo.save({
            id: log.id,
            userId: log.user_id,
            routineId: log.routine_id,
            date: log.date,
            completed: log.completed !== 0,
            completedAt: log.completed_at ? new Date(log.completed_at) : null,
            createdAt: log.created_at ? new Date(log.created_at) : new Date(),
          });
          stats.routineLogs++;
        }
      }
    }
    console.log(`✅ ${stats.routineLogs} logs de rotinas migrados\n`);

    // 9. Migrar MysteryPrizes
    console.log('🎰 Migrando prêmios misteriosos...');
    const mysteryPrizes = sqliteDb.prepare('SELECT * FROM mystery_prizes').all() as any[];
    if (mysteryPrizes.length > 0) {
      const mysteryRepo = postgresDataSource.getRepository(MysteryPrize);
      for (const prize of mysteryPrizes) {
        const existing = await mysteryRepo.findOne({ where: { id: prize.id } });
        if (!existing) {
          await mysteryRepo.save({
            id: prize.id,
            name: prize.name,
            emoji: prize.emoji,
            rarity: prize.rarity || 'common',
            description: prize.description,
            weight: prize.weight || 1,
            active: prize.active !== 0,
            createdAt: prize.created_at ? new Date(prize.created_at) : new Date(),
            updatedAt: prize.updated_at ? new Date(prize.updated_at) : new Date(),
          });
          stats.mysteryPrizes++;
        }
      }
    }
    console.log(`✅ ${stats.mysteryPrizes} prêmios misteriosos migrados\n`);

    // 10. Migrar RoutineTasks (tabela de relacionamento many-to-many)
    console.log('🔗 Migrando relacionamentos rotina-tarefa...');
    try {
      const routineTasks = sqliteDb.prepare('SELECT * FROM routine_tasks').all() as any[];
      if (routineTasks.length > 0) {
        for (const rt of routineTasks) {
          // Verificar se o relacionamento já existe
          const existing = await postgresDataSource.query(
            'SELECT * FROM routine_tasks WHERE routine_id = $1 AND task_id = $2',
            [rt.routine_id, rt.task_id],
          );
          if (existing.length === 0) {
            await postgresDataSource.query(
              'INSERT INTO routine_tasks (routine_id, task_id) VALUES ($1, $2)',
              [rt.routine_id, rt.task_id],
            );
            stats.routineTasks++;
          }
        }
      }
      console.log(`✅ ${stats.routineTasks} relacionamentos migrados\n`);
    } catch (error) {
      console.log('⚠️ Tabela routine_tasks não encontrada ou vazia (pode ser normal)\n');
    }

    // Resumo
    console.log('═══════════════════════════════════════');
    console.log('✨ MIGRAÇÃO CONCLUÍDA COM SUCESSO! ✨');
    console.log('═══════════════════════════════════════\n');
    console.log('📊 Resumo da migração:');
    console.log(`   👤 Usuários: ${stats.users}`);
    console.log(`   📝 Tarefas: ${stats.tasks}`);
    console.log(`   ⚠️ Penalidades: ${stats.penalties}`);
    console.log(`   🎁 Recompensas: ${stats.rewards}`);
    console.log(`   📅 Logs diários: ${stats.dailyLogs}`);
    console.log(`   📜 Histórico: ${stats.historyEntries}`);
    console.log(`   🔄 Rotinas: ${stats.routines}`);
    console.log(`   📋 Logs de rotinas: ${stats.routineLogs}`);
    console.log(`   🎰 Prêmios misteriosos: ${stats.mysteryPrizes}`);
    console.log(`   🔗 Relacionamentos: ${stats.routineTasks}\n`);

    // Fechar conexões
    sqliteDb.close();
    await postgresDataSource.destroy();
    console.log('✅ Conexões fechadas\n');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    sqliteDb.close();
    if (postgresDataSource.isInitialized) {
      await postgresDataSource.destroy();
    }
    process.exit(1);
  }
}

migrate();

