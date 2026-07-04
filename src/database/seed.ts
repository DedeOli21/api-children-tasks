import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserRole,
  Task,
  DailyLog,
  Penalty,
  Reward,
  RewardKind,
  HistoryEntry,
  Routine,
  RoutineLog,
  MysteryPrize,
  MysteryPrizeRarity,
  TeacherStudent,
  BehaviorReport,
  Mission,
  RoutineTemplate,
  RoutineTemplateTask,
  TherapistChild,
  StarRequest,
  Observation,
  Message,
  FocusSession,
  FamilyGoal,
  GoalDeposit,
  RewardEvent,
  ShopItem,
  ShopItemType,
  VirtualPet,
  InventoryItem,
  FamilySettings,
  Notification,
} from '../entities';
import { generateInviteCode } from '../children/invite-code.util';

const entities = [
  User,
  Task,
  DailyLog,
  Penalty,
  Reward,
  HistoryEntry,
  Routine,
  RoutineLog,
  MysteryPrize,
  TeacherStudent,
  BehaviorReport,
  Mission,
  RoutineTemplate,
  RoutineTemplateTask,
  TherapistChild,
  StarRequest,
  Observation,
  Message,
  FocusSession,
  FamilyGoal,
  GoalDeposit,
  RewardEvent,
  ShopItem,
  VirtualPet,
  InventoryItem,
  FamilySettings,
  Notification,
];

const dataSource = new DataSource(
  process.env.DATABASE_TYPE === 'postgres'
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities,
        synchronize: true,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        type: 'better-sqlite3',
        database: process.env.DATABASE_PATH || 'database.sqlite',
        entities,
        synchronize: true,
      },
);

async function seed() {
  await dataSource.initialize();

  console.log('🌱 Iniciando seed do banco de dados...\n');

  const userRepository = dataSource.getRepository(User);

  // Responsável demo
  let parent = await userRepository.findOne({
    where: { email: 'pai@demo.com' },
  });
  if (!parent) {
    parent = await userRepository.save(
      userRepository.create({
        name: 'Responsável Demo',
        email: 'pai@demo.com',
        password: await bcrypt.hash('123456', 10),
        role: UserRole.PARENT,
      }),
    );
    console.log('✅ Responsável criado (pai@demo.com / 123456)');
  } else {
    console.log('⏭️ Responsável já existe');
  }

  // Criança demo
  let child = await userRepository.findOne({ where: { email: 'gabriel' } });
  if (!child) {
    child = await userRepository.save(
      userRepository.create({
        name: 'Gabriel',
        email: 'gabriel',
        password: await bcrypt.hash('1234', 10),
        role: UserRole.CHILD,
        parentId: parent.id,
        inviteCode: generateInviteCode(),
      }),
    );
    console.log(`✅ Criança criada (usuário: gabriel / senha: 1234, código: ${child.inviteCode})`);
  } else {
    console.log('⏭️ Criança já existe');
  }

  // Professor demo (vinculado ao Gabriel)
  let teacher = await userRepository.findOne({
    where: { email: 'professora@demo.com' },
  });
  if (!teacher) {
    teacher = await userRepository.save(
      userRepository.create({
        name: 'Professora Demo',
        email: 'professora@demo.com',
        password: await bcrypt.hash('123456', 10),
        role: UserRole.TEACHER,
      }),
    );
    console.log('✅ Professor(a) criado (professora@demo.com / 123456)');
  } else {
    console.log('⏭️ Professor(a) já existe');
  }

  const teacherStudentRepository = dataSource.getRepository(TeacherStudent);
  const existingLink = await teacherStudentRepository.findOne({
    where: { teacherId: teacher.id, childId: child.id },
  });
  if (!existingLink) {
    await teacherStudentRepository.save(
      teacherStudentRepository.create({
        teacherId: teacher.id,
        childId: child.id,
      }),
    );
    console.log('✅ Professora vinculada ao Gabriel');
  }

  const familyId = parent.id;

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
      const createdTask = await taskRepository.save(
        taskRepository.create({ ...task, familyId }),
      );
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
      await penaltyRepository.save(penaltyRepository.create({ ...penalty, familyId }));
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
      {
        title: 'Escudo Mágico',
        emoji: '🛡️',
        description: 'Protege a sequência em um dia ruim',
        cost: 12,
        kind: RewardKind.STREAK_FREEZE,
      },
    ];

    for (const reward of rewards) {
      await rewardRepository.save(rewardRepository.create({ ...reward, familyId }));
    }
    console.log(`✅ ${rewards.length} recompensas criadas`);
  } else {
    console.log(`⏭️ Recompensas já existem (${existingRewards})`);
  }

  const existingMagicWateringCan = await rewardRepository.findOne({
    where: { familyId, title: 'Escudo Mágico' },
  });
  if (!existingMagicWateringCan) {
    await rewardRepository.save(
      rewardRepository.create({
        familyId,
        title: 'Escudo Mágico',
        emoji: '🛡️',
        description: 'Protege a sequência em um dia ruim',
        cost: 12,
        kind: RewardKind.STREAK_FREEZE,
      }),
    );
    console.log('✅ Escudo Mágico criado na loja');
  }

  // Seed de Prêmios da Caixa Surpresa
  const prizeRepository = dataSource.getRepository(MysteryPrize);
  const existingPrizes = await prizeRepository.count();

  if (existingPrizes === 0) {
    const prizes = [
      { name: 'Bala', emoji: '🍬', rarity: MysteryPrizeRarity.COMMON, description: 'Uma bala gostosa!', weight: 50 },
      { name: 'Adesivo', emoji: '🏷️', rarity: MysteryPrizeRarity.COMMON, description: 'Um adesivo legal!', weight: 50 },
      { name: 'Escolher sobremesa', emoji: '🍨', rarity: MysteryPrizeRarity.RARE, description: 'Você escolhe a sobremesa!', weight: 25 },
      { name: '10 min extra de jogo', emoji: '🎮', rarity: MysteryPrizeRarity.RARE, description: 'Mais tempo de diversão!', weight: 25 },
      { name: 'Filme especial', emoji: '🎬', rarity: MysteryPrizeRarity.EPIC, description: 'Assistir filme fora de hora!', weight: 10 },
      { name: 'Super prêmio', emoji: '🏆', rarity: MysteryPrizeRarity.LEGENDARY, description: 'O prêmio dos seus sonhos!', weight: 3 },
    ];

    for (const prize of prizes) {
      await prizeRepository.save(prizeRepository.create({ ...prize, familyId }));
    }
    console.log(`✅ ${prizes.length} prêmios da caixa surpresa criados`);
  } else {
    console.log(`⏭️ Prêmios já existem (${existingPrizes})`);
  }

  // Seed de Rotinas
  const routineRepository = dataSource.getRepository(Routine);
  const existingRoutines = await routineRepository.count();

  if (existingRoutines === 0 && createdTasks.length > 0) {
    const findTask = (title: string) => createdTasks.find((t) => t.title.includes(title));

    const routines = [
      {
        name: 'Rotina da Manhã',
        description: 'Tarefas para começar bem o dia',
        emoji: '🌅',
        timeOfDay: 'morning',
        sortOrder: 1,
        tasks: [findTask('dentes de manhã'), findTask('Arrumar a cama')].filter(Boolean) as Task[],
      },
      {
        name: 'Rotina da Tarde',
        description: 'Tarefas para a tarde',
        emoji: '☀️',
        timeOfDay: 'afternoon',
        sortOrder: 2,
        tasks: [findTask('dever de casa'), findTask('Beber água'), findTask('Comer frutas')].filter(Boolean) as Task[],
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
        familyId,
      });
      await routineRepository.save(newRoutine);
    }
    console.log(`✅ ${routines.length} rotinas criadas`);
  } else if (existingRoutines > 0) {
    console.log(`⏭️ Rotinas já existem (${existingRoutines})`);
  }

  // Catálogo padrão da Loja do Pet (familyId null = todas as famílias)
  const shopItemRepository = dataSource.getRepository(ShopItem);
  const existingShopItems = await shopItemRepository.count();

  if (existingShopItems === 0) {
    const shopItems = [
      // Consumíveis de sobrevivência
      { type: ShopItemType.WATER, name: 'Garrafinha de Água', emoji: '💧', price: 2, restoreAmount: 30, description: 'Mata a sede do pet' },
      { type: ShopItemType.WATER, name: 'Garrafa Cheia', emoji: '🚿', price: 5, restoreAmount: 100, description: 'Hidratação completa!' },
      { type: ShopItemType.FOOD, name: 'Adubo', emoji: '🌰', price: 3, restoreAmount: 30, description: 'Um lanchinho nutritivo' },
      { type: ShopItemType.FOOD, name: 'Petisco Premium', emoji: '🍯', price: 7, restoreAmount: 100, description: 'Banquete do pet!' },
      // Cenários
      { type: ShopItemType.BACKGROUND, name: 'Quarto Aconchegante', emoji: '🛏️', price: 10, description: 'Fundo de quarto' },
      { type: ShopItemType.BACKGROUND, name: 'Quintal Ensolarado', emoji: '🏡', price: 10, description: 'Fundo de quintal' },
      { type: ShopItemType.BACKGROUND, name: 'Espaço Sideral', emoji: '🌌', price: 20, description: 'Um pet astronauta!' },
      // Efeitos
      { type: ShopItemType.EFFECT, name: 'Máquina de Bolhas', emoji: '🫧', price: 30, description: 'Bolhas de sabão animadas' },
      { type: ShopItemType.EFFECT, name: 'Vagalumes', emoji: '✨', price: 30, description: 'Luzinhas dançantes' },
    ];
    for (const item of shopItems) {
      await shopItemRepository.save(shopItemRepository.create({ ...item, familyId: null }));
    }
    console.log(`✅ ${shopItems.length} itens do catálogo padrão da Loja do Pet criados`);
  } else {
    console.log(`⏭️ Itens da loja já existem (${existingShopItems})`);
  }

  console.log('\n✨ Seed concluído!\n');
  console.log('Contas demo:');
  console.log('  Responsável: pai@demo.com / 123456');
  console.log('  Criança:     gabriel / 1234');
  console.log('  Professora:  professora@demo.com / 123456\n');

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Erro no seed:', error);
  process.exit(1);
});
