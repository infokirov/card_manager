# Система управления карточками доступа сотрудников

Корпоративное веб-приложение для учёта сотрудников, карточек доступа, справочников и администрирования пользователей.

## Стек

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v3, shadcn/ui (Radix), Lucide React, Zod, React Hook Form
- **Backend:** Python 3.12, FastAPI, asyncpg, JWT
- **БД:** PostgreSQL 16 с RLS и функцией `has_role()`

## Быстрый старт (Docker)

```bash
docker compose up --build
```

- Приложение: http://localhost:3000
- API: http://localhost:8000/api/health
- PostgreSQL: localhost:5432

### Учётные записи по умолчанию

| Email | Пароль | Роль |
|-------|--------|------|
| admin@company.ru | admin123 | admin |
| zenitars@gmail.com | 190785 | admin |

## Локальная разработка

### Backend

```bash
cd backend
pip install -r requirements.txt
# PostgreSQL должен быть запущен (см. docker compose up db)
set DATABASE_URL=postgresql://card_app:card_app_secret@localhost:5432/card_manager
set SERVICE_DATABASE_URL=postgresql://card_service:card_service_secret@localhost:5432/card_manager
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Модули

- `/auth` — вход и регистрация нового сотрудника (публичная)
- `/` — сотрудники (CRUD для admin)
- `/access-cards` — карточки доступа, просмотр, печать
- `/directories/*` — справочники (чтение для всех, CRUD для admin)
- `/admin/users` — пользователи
- `/admin/notifications` — SMTP-уведомления
- `/admin/db-connection` — статус подключения к БД

## Edge-функции (API)

- `POST /api/edge/register-employee` — атомарное создание сотрудника и карточки
- `POST /api/edge/create-user` — создание пользователя (admin)
- `POST /api/edge/delete-user/{id}` — удаление аккаунта

## Деплой в GitHub (infokirov/card_manager)

```bash
git remote add origin https://github.com/infokirov/card_manager.git
git add .
git commit -m "Initial release: card access management system"
git push -u origin main
```
