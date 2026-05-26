from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import db_connection
from app.dependencies import CurrentUser, get_optional_user, require_admin
from app.schemas import DirectoryItem

router = APIRouter(prefix="/api/directories", tags=["directories"])

TABLES = {
    "departments": ("departments", ["name"]),
    "positions": ("positions", ["name"]),
    "access-resources": ("access_resources", ["name", "description"]),
    "internet-resources": ("internet_resources", ["name", "url", "description"]),
    "software": ("software", ["name", "version", "description"]),
    "abs-access": ("abs_access", ["name"]),
}


def _table_key(slug: str) -> tuple[str, list[str]]:
    if slug not in TABLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Справочник не найден")
    return TABLES[slug]


@router.get("/{slug}")
async def list_directory(
    slug: str,
    user: CurrentUser | None = Depends(get_optional_user),
):
    table, _ = _table_key(slug)
    uid = user.id if user else None
    async with db_connection(uid) as conn:
        rows = await conn.fetch(f"SELECT * FROM {table} ORDER BY name")
    return [dict(r) for r in rows]


@router.post("/{slug}")
async def create_directory_item(
    slug: str,
    body: DirectoryItem,
    user: CurrentUser = Depends(require_admin),
):
    table, fields = _table_key(slug)
    data = {"name": body.name}
    if "description" in fields and body.description is not None:
        data["description"] = body.description
    if "url" in fields and body.url is not None:
        data["url"] = body.url
    if "version" in fields and body.version is not None:
        data["version"] = body.version

    cols = ", ".join(data.keys())
    placeholders = ", ".join(f"${i+1}" for i in range(len(data)))
    async with db_connection(user.id) as conn:
        row = await conn.fetchrow(
            f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) RETURNING *",
            *data.values(),
        )
    return dict(row)


@router.put("/{slug}/{item_id}")
async def update_directory_item(
    slug: str,
    item_id: UUID,
    body: DirectoryItem,
    user: CurrentUser = Depends(require_admin),
):
    table, fields = _table_key(slug)
    sets = ["name = $1"]
    vals: list = [body.name]
    idx = 2
    if "description" in fields:
        sets.append(f"description = ${idx}")
        vals.append(body.description or "")
        idx += 1
    if "url" in fields:
        sets.append(f"url = ${idx}")
        vals.append(body.url or "")
        idx += 1
    if "version" in fields:
        sets.append(f"version = ${idx}")
        vals.append(body.version or "")
        idx += 1
    vals.append(item_id)

    async with db_connection(user.id) as conn:
        row = await conn.fetchrow(
            f"UPDATE {table} SET {', '.join(sets)} WHERE id = ${idx} RETURNING *",
            *vals,
        )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    return dict(row)


@router.delete("/{slug}/{item_id}")
async def delete_directory_item(
    slug: str,
    item_id: UUID,
    user: CurrentUser = Depends(require_admin),
):
    table, _ = _table_key(slug)
    async with db_connection(user.id) as conn:
        result = await conn.execute(f"DELETE FROM {table} WHERE id = $1", item_id)
    if result == "DELETE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    return {"ok": True}
