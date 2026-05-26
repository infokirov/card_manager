from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import db_connection, service_connection
from app.dependencies import CurrentUser, get_current_user, require_admin
from app.schemas import AccessCardUpdate
from app.services.notifications import send_access_card_notification

router = APIRouter(prefix="/api/access-cards", tags=["access-cards"])


async def _log_history(conn, card_id: UUID, action: str, user_id: UUID | None, field=None, old=None, new=None):
    await conn.execute(
        """
        INSERT INTO access_card_history (access_card_id, action_type, field_name, old_value, new_value, changed_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        card_id,
        action,
        field,
        old,
        new,
        user_id,
    )


@router.get("")
async def list_access_cards(
    user: CurrentUser = Depends(get_current_user),
    search: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort_by: str = "employee",
    sort_dir: str = "asc",
):
    order_map = {
        "employee": "e.full_name",
        "department": "d.name",
        "abs1": "ac.has_abs1_access",
        "abs2": "ac.has_abs2_access",
        "resources": "resource_count",
        "software": "software_count",
    }
    order_col = order_map.get(sort_by, "e.full_name")
    direction = "DESC" if sort_dir.lower() == "desc" else "ASC"
    offset = (page - 1) * page_size

    async with db_connection(user.id) as conn:
        where = "1=1"
        params: list = []
        if search.strip():
            where = "e.full_name ILIKE $1"
            params.append(f"%{search.strip()}%")

        total = await conn.fetchval(
            f"""
            SELECT COUNT(*) FROM access_cards ac
            JOIN employees e ON e.id = ac.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE {where}
            """,
            *params,
        )

        limit_idx = len(params) + 1
        offset_idx = len(params) + 2
        rows = await conn.fetch(
            f"""
            SELECT ac.id, ac.employee_id, ac.has_abs1_access, ac.has_abs2_access,
                   e.full_name AS employee_name, d.name AS department_name,
                   (SELECT COUNT(*) FROM access_card_resources WHERE access_card_id = ac.id) AS resource_count,
                   (SELECT COUNT(*) FROM access_card_software WHERE access_card_id = ac.id) AS software_count
            FROM access_cards ac
            JOIN employees e ON e.id = ac.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE {where}
            ORDER BY {order_col} {direction}
            LIMIT ${limit_idx} OFFSET ${offset_idx}
            """,
            *params,
            page_size,
            offset,
        )

    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/{card_id}")
async def get_access_card(card_id: UUID, user: CurrentUser = Depends(get_current_user)):
    async with db_connection(user.id) as conn:
        card = await conn.fetchrow(
            """
            SELECT ac.*, e.full_name AS employee_name, e.department_id, e.position_id,
                   d.name AS department_name, p.name AS position_name
            FROM access_cards ac
            JOIN employees e ON e.id = ac.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN positions p ON p.id = e.position_id
            WHERE ac.id = $1
            """,
            card_id,
        )
        if not card:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Карточка не найдена")

        resources = await conn.fetch(
            """
            SELECT r.id, r.name, r.description FROM access_card_resources acr
            JOIN access_resources r ON r.id = acr.resource_id
            WHERE acr.access_card_id = $1
            """,
            card_id,
        )
        internet = await conn.fetch(
            """
            SELECT ir.id, ir.name, ir.url, ir.description FROM access_card_internet_resources acir
            JOIN internet_resources ir ON ir.id = acir.internet_resource_id
            WHERE acir.access_card_id = $1
            """,
            card_id,
        )
        software = await conn.fetch(
            """
            SELECT s.id, s.name, s.version, s.description FROM access_card_software acs
            JOIN software s ON s.id = acs.software_id
            WHERE acs.access_card_id = $1
            """,
            card_id,
        )
        abs_items = await conn.fetch(
            """
            SELECT a.id, a.name FROM access_card_abs aca
            JOIN abs_access a ON a.id = aca.abs_access_id
            WHERE aca.access_card_id = $1
            """,
            card_id,
        )
        history = await conn.fetch(
            """
            SELECT id, action_type, field_name, old_value, new_value, changed_at
            FROM access_card_history WHERE access_card_id = $1
            ORDER BY changed_at DESC
            """,
            card_id,
        )

    return {
        "card": dict(card),
        "resources": [dict(r) for r in resources],
        "internet_resources": [dict(r) for r in internet],
        "software": [dict(r) for r in software],
        "abs_access": [dict(r) for r in abs_items],
        "history": [dict(h) for h in history],
    }


@router.put("/{card_id}")
async def update_access_card(
    card_id: UUID,
    body: AccessCardUpdate,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        old = await conn.fetchrow("SELECT * FROM access_cards WHERE id=$1", card_id)
        if not old:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Карточка не найдена")

        await conn.execute(
            """
            UPDATE access_cards SET has_abs1_access=$1, has_abs2_access=$2, updated_at=now()
            WHERE id=$3
            """,
            body.has_abs1_access,
            body.has_abs2_access,
            card_id,
        )

        await conn.execute("DELETE FROM access_card_resources WHERE access_card_id=$1", card_id)
        await conn.execute(
            "DELETE FROM access_card_internet_resources WHERE access_card_id=$1", card_id
        )
        await conn.execute("DELETE FROM access_card_software WHERE access_card_id=$1", card_id)
        await conn.execute("DELETE FROM access_card_abs WHERE access_card_id=$1", card_id)

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

        await _log_history(conn, card_id, "updated", user.id)

    return await get_access_card(card_id, user)


@router.delete("/{card_id}")
async def delete_access_card(
    card_id: UUID,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        await _log_history(conn, card_id, "deleted", user.id)
        result = await conn.execute("DELETE FROM access_cards WHERE id=$1", card_id)
    if result == "DELETE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Карточка не найдена")
    return {"ok": True}


@router.post("/for-employee/{employee_id}")
async def create_card_for_employee(
    employee_id: UUID,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        exists = await conn.fetchval(
            "SELECT id FROM access_cards WHERE employee_id=$1", employee_id
        )
        if exists:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Карточка уже существует")
        card_id = await conn.fetchval(
            """
            INSERT INTO access_cards (employee_id) VALUES ($1) RETURNING id
            """,
            employee_id,
        )
        await _log_history(conn, card_id, "created", user.id)
        emp = await conn.fetchrow(
            "SELECT full_name FROM employees WHERE id=$1", employee_id
        )

    async with service_connection() as conn:
        await send_access_card_notification(conn, emp["full_name"] if emp else "")

    return {"id": card_id}
