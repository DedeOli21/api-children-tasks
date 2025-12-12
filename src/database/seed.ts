import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { DailyLog } from '../entities/daily-log.entity';
import { Penalty } from '../entities/penalty.entity';
import { Reward } from '../entities/reward.entity';
import { HistoryEntry } from '../entities/history-entry.entity';
import { Routine } from '../entities/routine.entity';

const dataSource = new DataSource(
  process.env.DATABASE_TYPE === 'postgres'
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, Task, DailyLog, Penalty, Reward, HistoryEntry, Routine],
        synchronize: true,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        type: 'better-sqlite3',
        database: process.env.DATABASE_PATH || 'database.sqlite',
        entities: [User, Task, DailyLog, Penalty, Reward, HistoryEntry, Routine],
        synchronize: true,
      },
);

async function seed() {
  await dataSource.initialize();

  console.log('🌱 Iniciando seed do banco de dados...\n');

  // Seed de Usuário Admin
  const userRepository = dataSource.getRepository(User);
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@admin.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepository.create({
      name: 'Administrador',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      currentStars: 0,
    });
    await userRepository.save(admin);
    console.log('✅ Usuário admin criado (admin@admin.com / admin123)');
  } else {
    console.log('⏭️ Usuário admin já existe');
  }

  // Seed de Tarefas
  const taskRepository = dataSource.getRepository(Task);
  const existingTasks = await taskRepository.count();
  
  let createdTasks: Task[] = [];
  
  if (existingTasks === 0) {
    const tasks = [
      { title: 'Escovar os dentes de manhã', iconEmoji: '🪥' },
      { title: 'Escovar os dentes à noite', iconEmoji: '🪥' },
      { title: 'Arrumar a cama', iconEmoji: '🛏️' },
      { title: 'Guardar os brinquedos', iconEmoji: '🧸' },
      { title: 'Fazer o dever de casa', iconEmoji: '📚' },
      { title: 'Tomar banho', iconEmoji: '🚿' },
      { title: 'Comer frutas', iconEmoji: '🍎' },
      { title: 'Beber água', iconEmoji: '💧' },
      { title: 'Ajudar a arrumar a mesa', iconEmoji: '🍽️' },
      { title: 'Ler um livro', iconEmoji: '📖' },
    ];

    for (const task of tasks) {
      const createdTask = await taskRepository.save(taskRepository.create(task));
      createdTasks.push(createdTask);
    }
    console.log(`✅ ${tasks.length} tarefas criadas`);
  } else {
    console.log(`⏭️ Tarefas já existem (${existingTasks})`);
    createdTasks = await taskRepository.find();
  }

  // Seed de Penalidades
  const penaltyRepository = dataSource.getRepository(Penalty);
  const existingPenalties = await penaltyRepository.count();
  
  if (existingPenalties === 0) {
    const penalties = [
      { title: 'Briga com irmão/irmã', emoji: '😤', amount: 2 },
      { title: 'Não obedeceu', emoji: '🙉', amount: 1 },
      { title: 'Bagunça na casa', emoji: '🏠', amount: 1 },
      { title: 'Gritou ou fez birra', emoji: '😭', amount: 2 },
      { title: 'Disse palavra feia', emoji: '🤬', amount: 3 },
      { title: 'Não fez o combinado', emoji: '❌', amount: 1 },
    ];

    for (const penalty of penalties) {
      await penaltyRepository.save(penaltyRepository.create(penalty));
    }
    console.log(`✅ ${penalties.length} penalidades criadas`);
  } else {
    console.log(`⏭️ Penalidades já existem (${existingPenalties})`);
  }

  // Seed de Recompensas
  const rewardRepository = dataSource.getRepository(Reward);
  const existingRewards = await rewardRepository.count();
  
  if (existingRewards === 0) {
    const rewards = [
      { title: '30 min de videogame', emoji: '🎮', cost: 10 },
      { title: '30 min de TV/Desenho', emoji: '📺', cost: 10 },
      { title: 'Escolher o filme da noite', emoji: '🎬', cost: 15 },
      { title: 'Sobremesa especial', emoji: '🍰', cost: 8 },
      { title: 'Passeio no parque', emoji: '🏞️', cost: 20 },
      { title: 'Brinquedo pequeno', emoji: '🎁', cost: 50 },
      { title: 'Dormir mais tarde', emoji: '🌙', cost: 15 },
      { title: 'Escolher o jantar', emoji: '🍕', cost: 12 },
    ];

    for (const reward of rewards) {
      await rewardRepository.save(rewardRepository.create(reward));
    }
    console.log(`✅ ${rewards.length} recompensas criadas`);
  } else {
    console.log(`⏭️ Recompensas já existem (${existingRewards})`);
  }

  // Seed de Rotinas
  const routineRepository = dataSource.getRepository(Routine);
  const existingRoutines = await routineRepository.count();
  
  if (existingRoutines === 0 && createdTasks.length > 0) {
    // Encontrar tarefas por título para associar às rotinas
    const findTask = (title: string) => createdTasks.find(t => t.title.includes(title));
    
    const routines = [
      {
        name: 'Rotina da Manhã',
        description: 'Tarefas para começar bem o dia',
        emoji: '🌅',
        timeOfDay: 'morning',
        sortOrder: 1,
        tasks: [
          findTask('dentes de manhã'),
          findTask('Arrumar a cama'),
        ].filter(Boolean) as Task[],
      },
      {
        name: 'Rotina da Tarde',
        description: 'Tarefas para a tarde',
        emoji: '☀️',
        timeOfDay: 'afternoon',
        sortOrder: 2,
        tasks: [
          findTask('dever de casa'),
          findTask('Beber água'),
          findTask('Comer frutas'),
        ].filter(Boolean) as Task[],
      },
      {
        name: 'Rotina da Noite',
        description: 'Tarefas antes de dormir',
        emoji: '🌙',
        timeOfDay: 'night',
        sortOrder: 3,
        tasks: [
          findTask('Tomar banho'),
          findTask('dentes à noite'),
          findTask('Guardar os brinquedos'),
          findTask('Ler um livro'),
        ].filter(Boolean) as Task[],
      },
    ];

    for (const routine of routines) {
      const newRoutine = routineRepository.create({
        name: routine.name,
        description: routine.description,
        emoji: routine.emoji,
        timeOfDay: routine.timeOfDay,
        sortOrder: routine.sortOrder,
        tasks: routine.tasks,
      });
      await routineRepository.save(newRoutine);
    }
    console.log(`✅ ${routines.length} rotinas criadas`);
  } else if (existingRoutines > 0) {
    console.log(`⏭️ Rotinas já existem (${existingRoutines})`);
  }

  console.log('\n✨ Seed concluído!\n');
  
  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Erro no seed:', error);
  process.exit(1);
});
