# AGENTS.md

## Cursor Cloud specific instructions

### Overview

`children-task-api` is a NestJS 11 REST API (TypeScript) for managing children's tasks, rewards, penalties, routines, and streaks. It uses SQLite (via `better-sqlite3`) for development — no external database required.

### Running the dev server

```bash
npm run start:dev
```

Server starts on port 3000 with hot reload. All endpoints are prefixed with `/api`. Health check: `GET /api/health`.

### Key commands

See `package.json` `scripts` for full list. Summary:

- **Lint**: `npm run lint` (has pre-existing lint errors in the codebase — these are not regressions)
- **Unit tests**: `npm run test` (no spec files currently exist in `src/`)
- **E2E tests**: `npm run test:e2e` (default scaffold test fails because app uses `/api` prefix instead of `/`)
- **Seed**: `npm run seed` (populates DB with sample admin user `admin@admin.com` / `admin123`)
- **Build**: `npm run build`

### Non-obvious notes

- The SQLite database file (`database.sqlite`) is committed to the repo and already contains seed data. TypeORM `synchronize: true` is enabled for non-production, so schema changes are auto-applied.
- Task creation (`POST /api/tasks`) requires admin role. Register a normal user via `POST /api/auth/register`, or use the seeded admin account to create tasks.
- No `.env` file is needed for local dev — all env vars have sensible defaults (port 3000, SQLite, default JWT secret).
- The e2e test in `test/app.e2e-spec.ts` is a NestJS default scaffold that expects `GET / → 200 "Hello World!"` but the app routes are under `/api`, so it fails. This is pre-existing and not a regression.
