from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth import decode_token
from app.database import db_connection

security = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, id: UUID, email: str, role: str, display_name: str):
        self.id = id
        self.email = email
        self.role = role
        self.display_name = display_name

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


async def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> CurrentUser | None:
    if not creds:
        return None
    payload = decode_token(creds.credentials)
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


async def get_current_user(
    user: CurrentUser | None = Depends(get_optional_user),
) -> CurrentUser:
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация")
    return user


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступ только для администратора")
    return user
