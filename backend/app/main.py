from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import hash_password
from app.config import settings
from app.database import close_pools, init_pools, service_connection
from app.routers import access_cards, admin, auth_router, directories, edge, employees

SEED_USERS = [
    ("admin@company.ru", "admin123"),
    ("zenitars@gmail.com", "190785"),
]


async def seed_passwords():
    async with service_connection() as conn:
        for email, password in SEED_USERS:
            pw_hash = hash_password(password)
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2)",
                pw_hash,
                email,
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pools()
    await seed_passwords()
    yield
    await close_pools()


app = FastAPI(
    title="Система управления карточками доступа",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(employees.router)
app.include_router(access_cards.router)
app.include_router(directories.router)
app.include_router(edge.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
