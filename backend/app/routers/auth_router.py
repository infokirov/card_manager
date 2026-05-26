from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token, hash_password, verify_password
from app.database import db_connection, service_connection
from app.dependencies import CurrentUser, get_current_user
from app.schemas import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    async with service_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT u.id, u.email, u.password_hash, u.email_confirmed,
                   COALESCE(ur.role, 'user') AS role,
                   COALESCE(p.display_name, '') AS display_name
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE lower(u.email) = lower($1)
            """,
            body.email,
        )
    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")
    if not row["email_confirmed"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email не подтверждён")
    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")

    token = create_access_token(row["id"], row["email"], row["role"])
    return AuthResponse(
        access_token=token,
        user_id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        role=row["role"],
    )


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    pw_hash = hash_password(body.password)
    async with service_connection() as conn:
        exists = await conn.fetchval(
            "SELECT 1 FROM users WHERE lower(email) = lower($1)", body.email
        )
        if exists:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Пользователь уже существует")
        user_id = await conn.fetchval(
            """
            INSERT INTO users (email, password_hash, email_confirmed)
            VALUES ($1, $2, true) RETURNING id
            """,
            body.email,
            pw_hash,
        )
        await conn.execute(
            "INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)",
            user_id,
            body.display_name,
        )
        await conn.execute(
            "INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')",
            user_id,
        )
    token = create_access_token(user_id, body.email, "user")
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        email=body.email,
        display_name=body.display_name,
        role="user",
    )


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
    }


@router.delete("/account")
async def delete_own_account(user: CurrentUser = Depends(get_current_user)):
    async with service_connection() as conn:
        await conn.execute("DELETE FROM users WHERE id = $1", user.id)
    return {"ok": True}
