from contextlib import asynccontextmanager
from uuid import UUID

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None
_service_pool: asyncpg.Pool | None = None


async def init_pools() -> None:
    global _pool, _service_pool
    _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=20)
    _service_pool = await asyncpg.create_pool(settings.service_database_url, min_size=1, max_size=5)


async def close_pools() -> None:
    global _pool, _service_pool
    if _pool:
        await _pool.close()
        _pool = None
    if _service_pool:
        await _service_pool.close()
        _service_pool = None


def get_pool() -> asyncpg.Pool:
    if not _pool:
        raise RuntimeError("Database pool not initialized")
    return _pool


def get_service_pool() -> asyncpg.Pool:
    if not _service_pool:
        raise RuntimeError("Service pool not initialized")
    return _service_pool


@asynccontextmanager
async def db_connection(user_id: UUID | None = None):
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            if user_id:
                await conn.execute(
                    "SELECT set_config('app.current_user_id', $1, true)",
                    str(user_id),
                )
            yield conn


@asynccontextmanager
async def service_connection():
    pool = get_service_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn
