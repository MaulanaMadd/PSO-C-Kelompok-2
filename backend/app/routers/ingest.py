import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import get_pool

router = APIRouter(tags=["Ingest"])
logger = logging.getLogger(__name__)


class IngestPayload(BaseModel):
    filename: str
    rows: List[Dict[str, Any]]


STG_COLUMNS = [
    "tgl",
    "potnum",
    "potday",
    "gen",
    "ctype",
    "pot_status",
    "transition",
    "age_day",
    "age_month",
    "class",
    "pot_design",
    "tshift",
    "ac_schedule",
    "mt_schedule",
    "mt_shift",
    "mt_day",
    "metal_kg",
    "dross",
    "ov",
    "ce",
    "dc",
    "metal_leak",
    "group_current",
    "avv",
    "psp",
    "osp",
    "noise",
    "cb",
    "fd",
    "oa",
    "aef",
    "aev",
    "ae_dur",
    "ae_kwh",
    "m",
    "mc",
    "s",
    "cd",
    "bt",
    "alf3_kg",
    "mt_bb",
    "feed_pct",
    "pl_current",
    "bt_in_target",
    "bath_tap",
    "bath_charge",
    "anode_reset",
    "nipple_kg",
    "c_tapping",
    "meji",
    "frozen_bath",
    "bath_powder",
    "return_crust",
    "dross_trp",
    "bbar_miring",
    "belly_helly",
    "temp_ac",
    "metal_scrap",
    "metal_ball",
    "soda_ash",
    "break_sp",
    "break_local",
    "nipple_freq",
    "broke_anode_kg",
    "broke_anode_freq",
    "rwb_kg",
    "rwb_freq",
    "fe",
    "si",
    "sa",
    "caf2",
    "s1a",
    "s1b",
    "sa_in_target",
    "tacb",
    "kerak_kg",
    "kerak_freq",
    "beto",
    "tebl",
    "jf",
    "mix_welding",
    "ba_clad",
    "n_bulat",
    "rod_rj",
    "fe_charge",
    "source",
]


@router.post("/pot-daily")
async def ingest_pot_daily(
    payload: IngestPayload, current_user: dict = Depends(get_current_user)
):
    if not payload.rows:
        return {"success": True, "count": 0, "message": "No rows to ingest."}

    insert_data = []
    for row in payload.rows:
        row_tuple = tuple(None if row.get(col) == "" else row.get(col) for col in STG_COLUMNS)
        insert_data.append(row_tuple)

    columns_str = ", ".join(STG_COLUMNS)
    placeholders_str = ", ".join(f"${i + 1}" for i in range(len(STG_COLUMNS)))

    query = f"""
        INSERT INTO stg.pot_daily_ingest ({columns_str})
        VALUES ({placeholders_str})
    """

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Insert data to staging table
            await conn.executemany(query, insert_data)
            
            # Insert record into upload_history
            user_email = current_user.get("email", "System")
                
            await conn.execute(
                """
                INSERT INTO public.upload_history (filename, uploaded_by)
                VALUES ($1, $2)
                """,
                payload.filename, user_email
            )

        # Run ETL process synchronously so data is ready when frontend refreshes
        import subprocess
        import os
        import sys
        # Run from the backend root directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        subprocess.run([sys.executable, "scripts/seed_process.py"], cwd=backend_dir, check=True)

        return {"success": True, "count": len(insert_data), "message": "Data berhasil diunggah dan dianalisis."}
    except subprocess.CalledProcessError as e:
        logger.error(f"ETL process failed: {e}")
        raise HTTPException(status_code=500, detail="Upload berhasil ke sistem, namun proses analisis ETL gagal memproses data (mungkin ada format yang salah).")
    except Exception as e:
        logger.error(f"Error ingesting pot daily data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_upload_history(current_user: dict = Depends(get_current_user)):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            records = await conn.fetch(
                """
                SELECT id, filename, uploaded_by, uploaded_at
                FROM public.upload_history
                ORDER BY uploaded_at DESC
                """
            )
            return [dict(r) for r in records]
    except Exception as e:
        logger.error(f"Error fetching upload history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/history/{history_id}")
async def delete_upload_history(history_id: int, current_user: dict = Depends(get_current_user)):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Get the filename first
            record = await conn.fetchrow(
                "SELECT filename FROM public.upload_history WHERE id = $1", history_id
            )
            if not record:
                raise HTTPException(status_code=404, detail="Riwayat tidak ditemukan")
            
            filename = record["filename"]
            
            async with conn.transaction():
                # Delete from history
                await conn.execute("DELETE FROM public.upload_history WHERE id = $1", history_id)
                # Delete from mart and raw based on source
                await conn.execute("DELETE FROM mart.pot_params_daily WHERE source = $1", filename)
                await conn.execute("DELETE FROM raw.pot_daily WHERE source = $1", filename)
                
            return {"success": True, "message": f"Data {filename} berhasil dihapus"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting upload history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

