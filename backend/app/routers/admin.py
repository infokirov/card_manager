from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import db_connection, service_connection
from app.dependencies import CurrentUser, require_admin
from app.schemas import NotificationSettingsUpdate, TestEmailRequest
from app.services.notifications import send_test_email

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users(admin: CurrentUser = Depends(require_admin)):
    async with service_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT u.id, u.email, COALESCE(p.display_name, '') AS display_name,
                   COALESCE(ur.role, 'user') AS role
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            ORDER BY p.display_name, u.email
            """
        )
    return [dict(r) for r in rows]


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: UUID,
    role: str = Query(...),
    admin: CurrentUser = Depends(require_admin),
):
    if role not in ("admin", "user"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Недопустимая роль")
    async with service_connection() as conn:
        await conn.execute(
            """
            INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET role = $2
            """,
            user_id,
            role,
        )
    return {"ok": True}


@router.delete("/users/{user_id}")
async def delete_user_admin(
    user_id: UUID,
    admin: CurrentUser = Depends(require_admin),
):
    if admin.id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя удалить свой аккаунт здесь")
    async with service_connection() as conn:
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)
    return {"ok": True}


@router.get("/notifications")
async def get_notifications(admin: CurrentUser = Depends(require_admin)):
    async with service_connection() as conn:
        row = await conn.fetchrow("SELECT * FROM notification_settings WHERE id = 1")
    return dict(row) if row else {}


@router.put("/notifications")
async def update_notifications(
    body: NotificationSettingsUpdate,
    admin: CurrentUser = Depends(require_admin),
):
    async with service_connection() as conn:
        row = await conn.fetchrow(
            """
            UPDATE notification_settings SET
                enabled = $1, smtp_host = $2, smtp_port = $3,
                smtp_login = $4, smtp_password = $5,
                sender_email = $6, sender_name = $7, use_tls = $8,
                recipients = $9
            WHERE id = 1
            RETURNING *
            """,
            body.enabled,
            body.smtp_host,
            body.smtp_port,
            body.smtp_login,
            body.smtp_password,
            body.sender_email,
            body.sender_name,
            body.use_tls,
            body.recipients,
        )
    return dict(row)


@router.post("/notifications/test")
async def test_notification(
    body: TestEmailRequest,
    admin: CurrentUser = Depends(require_admin),
):
    async with service_connection() as conn:
        settings = await conn.fetchrow("SELECT * FROM notification_settings WHERE id = 1")
        to = body.to_email or (settings["recipients"][0] if settings["recipients"] else admin.email)
        await send_test_email(settings, str(to))
    return {"ok": True, "sent_to": str(to)}


@router.get("/db-connection")
async def get_db_connection(admin: CurrentUser = Depends(require_admin)):
    from app.config import settings

    return {
        "host": "db",
        "port": 5432,
        "database": "card_manager",
        "user": "card_app",
        "ssl": False,
        "configured_url": settings.database_url.split("@")[-1] if "@" in settings.database_url else "",
    }


@router.post("/db-connection/test")
async def test_db_connection(admin: CurrentUser = Depends(require_admin)):
    async with service_connection() as conn:
        val = await conn.fetchval("SELECT 1")
    return {"ok": val == 1}
