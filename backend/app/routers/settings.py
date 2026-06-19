from typing import List

from fastapi import APIRouter

from app.db import get_pool
from app.schemas import KPIStandard, KPIStandardUpdate, SettingsResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/standards", response_model=SettingsResponse)
async def get_standards():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM public.kpi_standards ORDER BY key")
        standards = [KPIStandard(**dict(row)) for row in rows]
        return SettingsResponse(standards=standards)


@router.put("/standards", response_model=List[KPIStandard])
async def update_standards(updates: List[KPIStandardUpdate]):
    pool = await get_pool()
    updated_items = []

    async with pool.acquire() as conn:
        async with conn.transaction():
            for upd in updates:
                # Only update fields that are not None (if desired)
                # Here we assume the frontend sends the full new set of numeric values for a key

                # Construct dynamic update query
                fields = []
                values = []
                idx = 1

                if upd.min_val is not None:
                    fields.append(f"min_val = ${idx}")
                    values.append(upd.min_val)
                    idx += 1
                if upd.target_val is not None:
                    fields.append(f"target_val = ${idx}")
                    values.append(upd.target_val)
                    idx += 1
                if upd.max_val is not None:
                    fields.append(f"max_val = ${idx}")
                    values.append(upd.max_val)
                    idx += 1

                if not fields:
                    continue  # Nothing to update for this key

                values.append(upd.key)  # Key is the last arg
                query = f"""
                    UPDATE public.kpi_standards 
                    SET {", ".join(fields)}, updated_at = NOW()
                    WHERE key = ${idx}
                    RETURNING *
                """

                row = await conn.fetchrow(query, *values)
                if row:
                    updated_items.append(KPIStandard(**dict(row)))

    # Fetch all again or return updated? Let's return updated only
    return updated_items
