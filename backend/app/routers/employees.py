from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import db_connection
from app.dependencies import CurrentUser, get_current_user, require_admin
from app.schemas import EmployeeCreate, EmployeeUpdate

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("")
async def list_employees(
    user: CurrentUser = Depends(get_current_user),
    search: str = "",
    status_filter: str = Query("all", alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort_by: str = "full_name",
    sort_dir: str = "asc",
):
    allowed_sort = {"full_name", "department", "position", "status"}
    if sort_by not in allowed_sort:
        sort_by = "full_name"
    order_col = {
        "full_name": "e.full_name",
        "department": "d.name",
        "position": "p.name",
        "status": "e.is_dismissed",
    }[sort_by]
    direction = "DESC" if sort_dir.lower() == "desc" else "ASC"

    conditions = ["1=1"]
    params: list = []
    idx = 1

    if search.strip():
        conditions.append(f"e.full_name ILIKE ${idx}")
        params.append(f"%{search.strip()}%")
        idx += 1

    if status_filter == "active":
        conditions.append("e.is_dismissed = false")
    elif status_filter == "dismissed":
        conditions.append("e.is_dismissed = true")

    where = " AND ".join(conditions)
    offset = (page - 1) * page_size

    async with db_connection(user.id) as conn:
        total = await conn.fetchval(
            f"""
            SELECT COUNT(*) FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN positions p ON p.id = e.position_id
            WHERE {where}
            """,
            *params,
        )
        rows = await conn.fetch(
            f"""
            SELECT e.id, e.full_name, e.department_id, e.position_id, e.is_dismissed,
                   d.name AS department_name, p.name AS position_name
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN positions p ON p.id = e.position_id
            WHERE {where}
            ORDER BY {order_col} {direction}
            LIMIT ${idx} OFFSET ${idx + 1}
            """,
            *params,
            page_size,
            offset,
        )

    return {
        "items": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("")
async def create_employee(
    body: EmployeeCreate,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO employees (full_name, department_id, position_id, is_dismissed)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, department_id, position_id, is_dismissed
            """,
            body.full_name,
            body.department_id,
            body.position_id,
            body.is_dismissed,
        )
    return dict(row)


@router.put("/{employee_id}")
async def update_employee(
    employee_id: UUID,
    body: EmployeeUpdate,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        row = await conn.fetchrow(
            """
            UPDATE employees SET full_name=$1, department_id=$2, position_id=$3,
                is_dismissed=$4, updated_at=now()
            WHERE id=$5
            RETURNING id, full_name, department_id, position_id, is_dismissed
            """,
            body.full_name,
            body.department_id,
            body.position_id,
            body.is_dismissed,
            employee_id,
        )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return dict(row)


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: UUID,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        result = await conn.execute("DELETE FROM employees WHERE id=$1", employee_id)
    if result == "DELETE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return {"ok": True}


@router.post("/{employee_id}/copy")
async def copy_employee(
    employee_id: UUID,
    user: CurrentUser = Depends(require_admin),
):
    async with db_connection(user.id) as conn:
        src = await conn.fetchrow("SELECT * FROM employees WHERE id=$1", employee_id)
        if not src:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
        row = await conn.fetchrow(
            """
            INSERT INTO employees (full_name, department_id, position_id, is_dismissed)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, department_id, position_id, is_dismissed
            """,
            f"{src['full_name']} (копия)",
            src["department_id"],
            src["position_id"],
            src["is_dismissed"],
        )
    return dict(row)
