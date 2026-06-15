from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query

from ..core.recommendation_engine import RecommendationEngine
from ..db import get_pool
from ..repositories.dashboard_repo import DashboardRepo
from ..schemas import (
    DailyLatestResponse,
    HealthResponse,
    LayerLatestResponse,
    LayerRangeResponse,
    Log1hResponse,
    PotlinesResponse,
    PotsResponse,
)

router = APIRouter(prefix="", tags=["dashboard"])


async def get_dashboard_repo():
    pool = await get_pool()
    return DashboardRepo(pool)


@router.get("/health", response_model=HealthResponse)
async def health(repo: DashboardRepo = Depends(get_dashboard_repo)):
    try:
        async with repo.pool.acquire() as conn:
            await conn.execute("select 1;")
        return {"status": "ok", "db": "ok"}
    except Exception:
        return {"status": "ok", "db": "error"}


@router.get("/potlines", response_model=PotlinesResponse)
async def potlines(repo: DashboardRepo = Depends(get_dashboard_repo)):
    potlines = await repo.get_potlines()
    return {"potlines": potlines}


@router.get("/pots", response_model=PotsResponse)
async def pots(
    potline_id: int | None = Query(default=None),
    repo: DashboardRepo = Depends(get_dashboard_repo),
):
    pots = await repo.get_pots(potline_id)
    return {"potline_id": potline_id, "pots": pots}


@router.get("/layer/5m/latest", response_model=LayerLatestResponse)
async def layer_latest(
    potline_id: int | None = Query(default=None),
    repo: DashboardRepo = Depends(get_dashboard_repo),
):
    rows = await repo.get_layer_latest(potline_id)
    return {"potline_id": potline_id, "rows": rows}


@router.get("/daily/range", response_model=LayerRangeResponse)
async def layer_range(
    pot_id: int = Query(...),
    start: datetime = Query(...),
    end: datetime = Query(...),
    repo: DashboardRepo = Depends(get_dashboard_repo),
):
    rows = await repo.get_layer_range(pot_id, start, end)
    return {"pot_id": pot_id, "start": start, "end": end, "rows": rows}


@router.get("/log/1h/range", response_model=Log1hResponse)
async def log_1h_range(
    pot_id: int = Query(...),
    days: int = Query(default=30, ge=1, le=365),
    repo: DashboardRepo = Depends(get_dashboard_repo),
):
    rows = await repo.get_log_1h_range(pot_id, days)
    return {"pot_id": pot_id, "days": days, "rows": rows}


@router.get("/daily/latest", response_model=DailyLatestResponse)
async def daily_latest(
    potline_id: int | None = Query(default=None),
    source: str | None = Query(default=None),
    repo: DashboardRepo = Depends(get_dashboard_repo),
):
    rows = await repo.get_daily_latest(potline_id, source)
    return {"potline_id": potline_id, "rows": rows}


@router.get("/stats/trend")
async def stats_trend(
    potline_id: int | None = Query(default=None),
    source: str | None = Query(default=None),
    repo: DashboardRepo = Depends(get_dashboard_repo),
):
    trend_val = await repo.get_ce_trend(potline_id, source)
    return {"potline_id": potline_id, "avg_ce_trend": trend_val}


@router.get("/recommendations/{pot_id}")
async def get_recommendations(
    pot_id: int, repo: DashboardRepo = Depends(get_dashboard_repo)
):
    # Fetch data for the last 7 days to give context for trends
    # In production, maybe 4-5 days is enough for the specific rules (ALF3 zero run etc)
    # Using existing get_layer_range is efficient
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    rows = await repo.get_layer_range(pot_id, start_date, end_date)

    if not rows:
        return {"pot_id": pot_id, "recommendations": []}

    # Sort by date ascending (get_layer_range orders by date, but good to be sure)
    # The list is usually time series.
    # We want the LATEST row as the current status.
    # Note: get_layer_range orders by date ASC. So last element is latest.
    current_row = rows[-1]

    # Generate recommendations
    recs = RecommendationEngine.generate_recommendations(
        current_row, history_rows=list(reversed(rows))
    )

    return {"pot_id": pot_id, "recommendations": recs}
