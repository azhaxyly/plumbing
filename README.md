# Timsan.kz Fork

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

### Seed-данные

```bash
pnpm seed           # базовый seed: admin-пользователь, категории, бренды, демо-товары, настройки
pnpm seed:phase4    # seed для Phase 4: 21+ пользователей, 21+ заказов, 25+ записей аудита, настройки
```

`pnpm seed:phase4` создаёт данные, необходимые для тест-кейсов Phase 4 (TC-24 — TC-30, TC-RBAC):

| Данные | Количество | Назначение |
|---|---|---|
| Пользователи | 21 (1 admin + 1 manager + 19 customer) | Пагинация TC-27 |
| Заблокированные пользователи | 2 (`customer01`, `customer02`) | TC-27 фильтр по статусу |
| Заказы | 21 (по 6 в статусах `new`/`confirmed`/`delivered`, 3 `cancelled`) | Пагинация TC-26 |
| Заказы с разными датами | разброс ≥ 40 дней | TC-26 фильтр по дате |
| Заказы с разными суммами | от 5 000 до 500 000 KZT | TC-26 сортировка |
| AuditLog | 29 записей | Пагинация TC-29 |
| AuditLog системные | часть с `actorUserId = null` | TC-29.11 |
| Settings | `shop_phone`, `shop_email`, `shop_instagram`, `shop_legal_name`, `shop_bin`, `owner_emails`, `telegram_bot_token`, `telegram_chat_ids` | TC-28 |

Скрипт **идемпотентен** — повторный запуск не дублирует данные.

## Документация

Полная документация находится в `.kiro/specs/timsan/`:
- `design.md` — технический дизайн (High-Level + Low-Level)
- `README.md` — поэтапный план, ENV, чек-листы
- `tasks.md` — план реализации по задачам
