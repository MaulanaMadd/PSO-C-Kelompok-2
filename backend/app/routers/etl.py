import logging
import os

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.db import get_pool

router = APIRouter()

# --- SQL Queries (Ported) ---

# --- SQL Queries (Dynamic Templates) ---


def get_sql_upsert_5m(sim_ts: str) -> str:
    # sim_ts should be a Safe String literal or bound parameter.
    # Here using f-string injection for simplicity with existing execution pattern.
    return f"""
BEGIN;

WITH base AS (
  SELECT
    (date_trunc('hour', ts)
     + floor(extract(minute from ts)::numeric / 5) * interval '5 minute'
    ) AS ts_5m,
    (ts AT TIME ZONE '+07')::date AS date,
    pot_id,
    potline_id,
    avv, osp, noise, current,
    beam_pos, feed_pct, feed_state
  FROM raw.pot_log
  WHERE ts IS NOT NULL
    AND pot_id IS NOT NULL
    AND ts >= '{sim_ts}'::timestamptz - interval '15 minutes'
),
dedup AS (
  SELECT DISTINCT ON (ts_5m, pot_id)
    ts_5m, date, pot_id, potline_id,
    avv, osp, noise, current,
    beam_pos, feed_pct, feed_state
  FROM base
  ORDER BY ts_5m, pot_id DESC
)
INSERT INTO mart.clean_pot_log_5m (
  ts_5m, date, pot_id, potline_id,
  avv, osp, noise, current,
  beam_pos, feed_pct, feed_state
)
SELECT
  ts_5m, date, pot_id, potline_id,
  avv, osp, noise, current,
  beam_pos, feed_pct, feed_state
FROM dedup
ON CONFLICT (ts_5m, pot_id)
DO UPDATE SET
  date       = EXCLUDED.date,
  potline_id = EXCLUDED.potline_id,
  avv        = EXCLUDED.avv,
  osp        = EXCLUDED.osp,
  noise      = EXCLUDED.noise,
  current    = EXCLUDED.current,
  beam_pos   = EXCLUDED.beam_pos,
  feed_pct   = EXCLUDED.feed_pct,
  feed_state = EXCLUDED.feed_state;

DELETE FROM mart.clean_pot_log_5m
WHERE ts_5m < '{sim_ts}'::timestamptz - interval '2 days'; -- Increased retention for safety

COMMIT;
"""


def get_sql_upsert_1h(sim_ts: str) -> str:
    return f"""
BEGIN;

INSERT INTO mart.agg_pot_log_1h (
  ts_1h, pot_id, potline_id,
  avv_avg, osp_avg, noise_avg, current_avg,
  beam_pos_avg, feed_pct_avg
)
SELECT
  date_trunc('hour', ts_5m) AS ts_1h,
  pot_id,
  max(potline_id) AS potline_id,
  avg(avv)      AS avv_avg,
  avg(osp)      AS osp_avg,
  avg(noise)    AS noise_avg,
  avg(current)  AS current_avg,
  avg(beam_pos) AS beam_pos_avg,
  avg(feed_pct) AS feed_pct_avg
FROM mart.clean_pot_log_5m
WHERE ts_5m >= '{sim_ts}'::timestamptz - interval '2 hours'
GROUP BY 1,2
ON CONFLICT (ts_1h, pot_id)
DO UPDATE SET
  potline_id   = EXCLUDED.potline_id,
  avv_avg      = EXCLUDED.avv_avg,
  osp_avg      = EXCLUDED.osp_avg,
  noise_avg    = EXCLUDED.noise_avg,
  current_avg  = EXCLUDED.current_avg,
  beam_pos_avg = EXCLUDED.beam_pos_avg,
  feed_pct_avg = EXCLUDED.feed_pct_avg;

DELETE FROM mart.agg_pot_log_1h
WHERE ts_1h < '{sim_ts}'::timestamptz - interval '7 days';

COMMIT;
"""


def get_sql_snapshot_daily(sim_date: str) -> str:
    # Daily Snapshot uses a specific DATE string
    return f"""
BEGIN;

TRUNCATE TABLE mart.fact_pot_daily;

WITH ctrl AS (SELECT '{sim_date}'::date AS d),
pots AS (
  SELECT DISTINCT pot_id
  FROM raw.pot_daily
  WHERE pot_id IS NOT NULL AND date <= (SELECT d FROM ctrl)
)
INSERT INTO mart.fact_pot_daily (date, pot_id, potline_id, bt, ce)
SELECT
  (SELECT d FROM ctrl) AS date,
  pots.pot_id,
  bt_latest.potline_id,
  bt_latest.bt,
  ce_latest.ce
FROM pots
LEFT JOIN LATERAL (
  SELECT potline_id, bt
  FROM raw.pot_daily p
  WHERE p.pot_id = pots.pot_id
    AND p.date <= (SELECT d FROM ctrl)
  ORDER BY p.date DESC
  LIMIT 1
) bt_latest ON TRUE
LEFT JOIN LATERAL (
  SELECT ce
  FROM raw.pot_daily p
  WHERE p.pot_id = pots.pot_id
    AND p.date <= (SELECT d FROM ctrl)
    AND p.ce IS NOT NULL
    AND p.ce > 0
  ORDER BY p.date DESC
  LIMIT 1
) ce_latest ON TRUE;

COMMIT;
"""


# --- Helpers ---

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from datetime import datetime, timedelta, timezone


def get_simulated_now() -> datetime:
    """
    Returns the Simulated 'Now'.
    Logic: Uses current Real time (in WIB +7), but forces Date to 2025-12-02.
    """
    # Define WIB timezone
    wib = timezone(timedelta(hours=7))

    # Get current time in WIB
    wib_now = datetime.now(wib)

    # Force Year: 2025, but keep Month/Day from current real time
    # This assumes the simulation runs parallel to real calendar days.
    # If today is Jan 15, this might crash if we try to set Month=1 (since simulation is Dec 2025).
    # Checking user context: "2025-12-04" vs Real Date "Jan 15".
    # The gap is huge. Real date is Jan 2026. Simulation is Dec 2025.
    # Mapping logic: If we want "Today" to match "2025-12-04", and real date is Jan 15... that doesn't match.
    # User said "doest 06:55 is 13.55". That matches 7 hour timezone.

    # REVERTED TO 2025-12-02 AS PER USER REQUEST
    # User wants "today in sim is 12-02".

    sim_now = wib_now.replace(year=2025, month=12, day=2)
    return sim_now


def verify_secret(x_etl_secret: str | None = Header(default=None)):
    env_secret = os.getenv("ETL_SECRET")
    if not env_secret:
        # If secret not configured in env, fail secure
        raise HTTPException(
            status_code=500, detail="ETL_SECRET not configured on server"
        )

    if x_etl_secret != env_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


async def run_with_lock(lock_id: int, sql: str):
    """
    Tries to acquire an advisory lock. If successful, runs the SQL.
    Returns: {"ok": True} if ran, raises HTTPException if locked or error.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Try to acquire lock
        # pg_try_advisory_lock returns primitive boolean in asyncpg
        locked = await conn.fetchval("SELECT pg_try_advisory_lock($1)", lock_id)

        if not locked:
            raise HTTPException(status_code=409, detail="Job already running (locked)")

        try:
            # We have the lock. Run the job.
            await conn.execute(sql)
            return {"ok": True}
        except Exception as e:
            logger.error(f"ETL Execution Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            # Always unlock
            await conn.execute("SELECT pg_advisory_unlock($1)", lock_id)


# --- Routes ---


@router.post("/internal/etl/5m")
async def etl_5m(
    background_tasks: BackgroundTasks,
    x_etl_secret: str | None = Header(default=None, alias="x-etl-secret"),
):
    verify_secret(x_etl_secret)
    # PAUSED AS REQUESTED
    # sim_now = get_simulated_now()
    # sql = get_sql_upsert_5m(sim_now.isoformat())

    # Run in background to prevent HTTP timeout
    # background_tasks.add_task(run_with_lock, 50005, sql)
    return {"status": "paused", "job": "etl_5m"}


@router.post("/internal/etl/1h")
async def etl_1h(
    background_tasks: BackgroundTasks,
    x_etl_secret: str | None = Header(default=None, alias="x-etl-secret"),
):
    verify_secret(x_etl_secret)
    # PAUSED AS REQUESTED
    # sim_now = get_simulated_now()
    # sql = get_sql_upsert_1h(sim_now.isoformat())

    # background_tasks.add_task(run_with_lock, 50001, sql)
    return {"status": "paused", "job": "etl_1h"}


@router.post("/internal/snapshot/daily")
async def etl_daily(
    background_tasks: BackgroundTasks,
    x_etl_secret: str | None = Header(default=None, alias="x-etl-secret"),
):
    verify_secret(x_etl_secret)
    # PAUSED AS REQUESTED
    # sim_now = get_simulated_now()
    # # Daily snapshot usually runs at specific date.
    # sim_date_str = sim_now.strftime("%Y-%m-%d")
    # sql = get_sql_snapshot_daily(sim_date_str)

    # background_tasks.add_task(run_with_lock, 50024, sql)
    return {"status": "paused", "job": "etl_daily"}
