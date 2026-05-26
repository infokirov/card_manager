from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, status

from app.auth import decode_token, hash_password
from app.database import db_connection, service_connection
from app.dependencies import CurrentUser, get_current_user, require_admin
from app.schemas import CreateUserRequest, RegisterEmployeeRequest
from app.services.notifications import send_access_card_notification

router = APIRouter(prefix="/api/edge", tags=["edge"])


async def _auth_from_header(authorization: str | None = Header(None)) -> CurrentUser | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization[7:])
    if not payload:
        return None
    user_id = UUID(payload["sub"])
    async with db_connection(user_id) as conn:
        row = await conn.fetchrow(
            """
            SELECT u.id, u.email, COALESCE(ur.role, 'user') AS role,
                   COALESCE(p.display_name, '') AS display_name
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.id = $1
            """,
            user_id,
        )
    if not row:
        return None
    return CurrentUser(row["id"], row["email"], row["role"], row["display_name"])


@router.post("/register-employee")
async def register_employee(body: RegisterEmployeeRequest):
    """Public: create employee + access card atomically."""
    async with service_connection() as conn:
        emp_id = await conn.fetchval(
            """
            INSERT INTO employees (full_name, department_id, position_id)
            VALUES ($1, $2, $3) RETURNING id
            """,
            body.full_name,
            body.department_id,
            body.position_id,
        )
        card_id = await conn.fetchval(
            """
            INSERT INTO access_cards (employee_id, has_abs1_access, has_abs2_access)
            VALUES ($1, $2, $3) RETURNING id
            """,
            emp_id,
            body.has_abs1_access,
            body.has_abs2_access,
        )

        for rid in body.resource_ids:
            await conn.execute(
                "INSERT INTO access_card_resources (access_card_id, resource_id) VALUES ($1,$2)",
                card_id,
                rid,
            )
        for iid in body.internet_resource_ids:
            await conn.execute(
                "INSERT INTO access_card_internet_resources (access_card_id, internet_resource_id) VALUES ($1,$2)",
                card_id,
                iid,
            )
        for sid in body.software_ids:
            await conn.execute(
                "INSERT INTO access_card_software (access_card_id, software_id) VALUES ($1,$2)",
                card_id,
                sid,
            )
        for aid in body.abs_access_ids:
            await conn.execute(
                "INSERT INTO access_card_abs (access_card_id, abs_access_id) VALUES ($1,$2)",
                card_id,
                aid,
            )

        await conn.execute(
            """
            INSERT INTO access_card_history (access_card_id, action_type)
            VALUES ($1, 'created')
            """,
            card_id,
        )

        await send_access_card_notification(conn, body.full_name)

    return {"employee_id": emp_id, "access_card_id": card_id}


@router.post("/create-user")
async def create_user(
    body: CreateUserRequest,
    admin: CurrentUser = Depends(require_admin),
):
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
            "INSERT INTO user_roles (user_id, role) VALUES ($1, $2)",
            user_id,
            body.role,
        )
    return {"id": user_id}


@router.post("/delete-user/{target_user_id}")
async def delete_user(
    target_user_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    if user.id != target_user_id and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Недостаточно прав")
    if user.id == target_user_id and user.is_admin:
        pass  # allow self-delete
    async with service_connection() as conn:
        await conn.execute("DELETE FROM users WHERE id = $1", target_user_id)
    return {"ok": True}
