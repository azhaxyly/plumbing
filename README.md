# Whitehouse.kz Fork

> Современный форк интернет-магазина сантехники и мебели для ванной комнаты на базе **Next.js 15 + TypeScript + PostgreSQL**, с онлайн-оплатой через **Kaspi API** и адаптацией под рынок Казахстана.

## Быстрый старт (dev)

```bash
# 1. Конфигурация
cp .env.example .env
# Откройте .env и заполните: DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, S3_*, KASPI_*

# 2. Зависимости + локальная инфра
pnpm install
docker compose -f infra/docker-compose.yml up -d

# 3. Миграции БД и сидинг
pnpm prisma migrate dev
pnpm seed

# 4. Запуск
pnpm dev       # Next.js — http://localhost:3000
pnpm worker    # BullMQ worker (отдельный терминал)
```

## Структура монорепо

```
.
├── apps/
│   ├── web/        # Next.js 15 (витрина + /admin)
│   └── worker/     # BullMQ worker
├── packages/
│   ├── db/         # Prisma schema + клиент
│   ├── domain/     # Чистая доменная логика
│   ├── payments/   # PaymentProvider + KaspiClient
│   ├── search/     # Meilisearch обёртка
│   ├── ui/         # shadcn-компоненты
│   └── shared/     # zod, utils, env
├── infra/
│   └── docker-compose.yml
├── tests/
│   ├── pbt/        # property-based тесты
│   ├── e2e/        # Playwright
│   └── fixtures/
├── .env.example
└── README.md
```

## Команды

```bash
pnpm build        # сборка всех пакетов
pnpm dev          # dev-режим
pnpm lint         # ESLint
pnpm typecheck    # TypeScript проверка
pnpm test         # unit + integration тесты
pnpm test:pbt     # property-based тесты
pnpm format       # Prettier форматирование
```

## Документация

Полная документация находится в `.kiro/specs/whitehouse-kz-fork/`:
- `design.md` — технический дизайн (High-Level + Low-Level)
- `README.md` — поэтапный план, ENV, чек-листы
- `tasks.md` — план реализации по задачам
