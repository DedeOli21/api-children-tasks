// Executado pelo Jest antes de qualquer módulo do teste ser carregado
// (via "setupFiles" no jest-e2e.json). Garante que toda suíte e2e rode
// contra um SQLite isolado em memória, nunca contra o banco de dev/produção.
process.env.DATABASE_TYPE = 'sqlite';
delete process.env.DATABASE_URL;
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
