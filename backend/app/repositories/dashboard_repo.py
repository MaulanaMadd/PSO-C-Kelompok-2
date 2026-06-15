from datetime import datetime
from typing import Any, Dict, List, Optional

from asyncpg import Pool

from .base_repo import BaseRepo


class DashboardRepo(BaseRepo):
    def __init__(self, pool: Pool):
        super().__init__(pool)

    async def get_potlines(self) -> List[int]:
        query = """
        SELECT DISTINCT potline_id
        FROM mart.pot_latest_snapshot
        WHERE potline_id IS NOT NULL
        ORDER BY potline_id;
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
        return [r["potline_id"] for r in rows]

    async def get_pots(self, potline_id: Optional[int]) -> List[int]:
        query = """
        SELECT DISTINCT pot_id
        FROM mart.pot_latest_snapshot
        WHERE ($1::int IS NULL OR potline_id = $1)
        ORDER BY pot_id;
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, potline_id)
        return [r["pot_id"] for r in rows]

    async def get_layer_latest(self, potline_id: Optional[int]) -> List[Dict[str, Any]]:
        # Map daily params to the structure expected by frontend 'layer'
        # ts_5m -> date + 12:00:00
        query = """
        SELECT DISTINCT ON (pot_id)
          pot_id, potline_id, 
          (date + time '12:00:00') as ts_5m,
          avv, 
          0 as osp, 
          noise, 
          0 as current,
          0 as beam_pos, 
          0 as feed_pct, 
          'Unknown' as feed_state,
          bt, ce, m, aef
        FROM mart.pot_params_daily
        WHERE ($1::int IS NULL OR potline_id = $1)
        ORDER BY pot_id, date DESC;
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, potline_id)
        return [dict(r) for r in rows]

    async def get_layer_range(
        self, pot_id: int, start: datetime, end: datetime
    ) -> List[Dict[str, Any]]:
        # Ensure datetimes are naive to match DB constructed timestamp
        if start.tzinfo is not None:
            start = start.replace(tzinfo=None)
        if end.tzinfo is not None:
            end = end.replace(tzinfo=None)

        query = """
        SELECT
          (date + time '12:00:00') as ts_5m, 
          pot_id, potline_id,
          date,
          
          -- Main KPIs (already there)
          avv, osp, noise, pl_current as current,
          m, feed_pct, 'Unknown' as feed_state,
          bt, ce, aef, oa, ov, pl_current, 
          alf3_kg as alf3, caf2, psp, ae_dur, age_day,
          
          -- Comprehensive List
          potday, gen, ctype, pot_status_code, transition, age_month,
          class AS class_, pot_design, tshift,
          ac_schedule, mt_schedule, mt_shift, mt_day,
          metal_kg, dross, dc, metal_leak, group_current,
          cb, fd, aev, ae_kwh, mc, s, cd, mt_bb,
          bt_in_target, bath_tap, bath_charge, anode_reset, nipple_kg,
          c_tapping, meji, frozen_bath, bath_powder, return_crust,
          dross_trp, bbar_miring, belly_helly, temp_ac, metal_scrap,
          metal_ball, soda_ash, break_sp, break_local, nipple_freq,
          broke_anode_kg, broke_anode_freq, rwb_kg, rwb_freq,
          fe, si, sa, s1a, s1b, sa_in_target, tacb,
          kerak_kg, kerak_freq, beto, tebl, jf, mix_welding,
          ba_clad, n_bulat, rod_rj, fe_charge

        FROM mart.pot_params_daily
        WHERE pot_id = $1
          AND (date + time '12:00:00') >= $2
          AND (date + time '12:00:00') <= $3
        ORDER BY date ASC;
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, pot_id, start, end)
        return [dict(r) for r in rows]

    async def get_log_1h_range(self, pot_id: int, days: int) -> List[Dict[str, Any]]:
        # Log data is deprecated/removed. Return empty list.
        return []

    async def get_daily_latest(self, potline_id: Optional[int], source: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Optimized query using CTEs and window functions for better performance.
        NOTE: Ensure indexes exist on pot_params_daily(pot_id, date DESC) and ce_predicted_daily(pot_id, pred_date)
        """
        query = """
        WITH latest_dates AS (
            -- Get the most recent date per pot (much faster with index)
            SELECT pot_id, MAX(date) as max_date
            FROM mart.pot_params_daily
            WHERE ($1::int IS NULL OR potline_id = $1)
            AND ($2::text IS NULL OR source = $2)
            GROUP BY pot_id
        ),
        current_data AS (
            -- Get current day data
            SELECT 
                p.pot_id, p.potline_id, p.date, (p.date + time '12:00:00') as ts_5m,
                p.bt, p.ce, p.m, p.aef, p.ov, p.avv, p.noise, p.age_day,
                p.feed_pct, p.oa, p.osp, p.pl_current, p.alf3_kg as alf3, p.caf2,
                p.psp, p.ae_dur, p.potday::text
            FROM mart.pot_params_daily p
            INNER JOIN latest_dates ld ON p.pot_id = ld.pot_id AND p.date = ld.max_date
            WHERE ($2::text IS NULL OR p.source = $2)
        ),
        prev_data AS (
            -- Get previous day CE (for delta calculation)
            SELECT 
                p.pot_id,
                p.ce as prev_ce
            FROM mart.pot_params_daily p
            INNER JOIN latest_dates ld ON p.pot_id = ld.pot_id AND p.date = ld.max_date - INTERVAL '1 day'
            WHERE ($2::text IS NULL OR p.source = $2)
        ),
        last_valid_ce AS (
            -- Get last known non-zero CE (fallback for pots with CE=0)
            SELECT DISTINCT ON (pot_id)
                pot_id, ce as last_ce
            FROM mart.pot_params_daily
            WHERE ce > 0 
              AND ($1::int IS NULL OR potline_id = $1)
              AND ($2::text IS NULL OR source = $2)
            ORDER BY pot_id, date DESC
        ),
        predictions AS (
            -- Get latest predictions (pre-aggregated)
            SELECT DISTINCT ON (pot_id, pred_date) 
                pot_id, pred_date, yhat_ce, yhat_lo, yhat_hi
            FROM mart.ce_predicted_daily
            WHERE model_version = 'v1.0'
              AND ($1::int IS NULL OR EXISTS (
                  SELECT 1 FROM mart.pot_params_daily 
                  WHERE pot_params_daily.pot_id = ce_predicted_daily.pot_id 
                    AND potline_id = $1
                  LIMIT 1
              ))
            ORDER BY pot_id, pred_date, created_at DESC
        )
        SELECT 
            cd.pot_id, cd.potline_id, cd.date, cd.ts_5m,
            cd.bt,
            -- Use current CE if > 0, otherwise fallback to last valid CE
            COALESCE(NULLIF(cd.ce, 0), lv.last_ce) as ce,
            pd.prev_ce,
            cd.m, cd.aef, cd.ov, cd.avv, cd.noise, cd.age_day,
            cd.feed_pct, cd.oa, cd.osp, cd.pl_current, cd.alf3, cd.caf2,
            cd.psp, cd.ae_dur, cd.potday,
            pc.yhat_ce as predicted_ce,
            pc.yhat_lo, pc.yhat_hi
        FROM current_data cd
        LEFT JOIN prev_data pd ON cd.pot_id = pd.pot_id
        LEFT JOIN last_valid_ce lv ON cd.pot_id = lv.pot_id
        LEFT JOIN predictions pc ON cd.pot_id = pc.pot_id AND pc.pred_date = cd.date + INTERVAL '1 day'
        ORDER BY cd.pot_id;
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, potline_id, source)
        return [dict(r) for r in rows]

    async def get_ce_trend(self, potline_id: Optional[int], source: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates the difference between Today and Yesterday for:
        1. AVG CE (ce_trend)
        2. Status Counts (optimal_diff, warning_diff, critical_diff)
        """
        # Thresholds: Optimal > 90, Warning 85-90, Critical < 85
        # Offline is handled separately or ignored in trend for now (focus on active pots)
        query = """
        WITH latestpath AS (
            SELECT max(date) as max_d 
            FROM mart.pot_params_daily
            WHERE ($1::int IS NULL OR potline_id = $1)
            AND ($2::text IS NULL OR source = $2)
        ),
        daily_stats AS (
            SELECT 
                date,
                AVG(NULLIF(ce,0)) as avg_ce,
                COUNT(CASE WHEN ce > 90 THEN 1 END) as cnt_optimal,
                COUNT(CASE WHEN ce >= 85 AND ce <= 90 THEN 1 END) as cnt_warning,
                COUNT(CASE WHEN ce < 85 AND ce > 0 THEN 1 END) as cnt_critical
            FROM mart.pot_params_daily
            WHERE ($1::int IS NULL OR potline_id = $1)
              AND ($2::text IS NULL OR source = $2)
              AND date >= (SELECT max_d - 1 FROM latestpath)
            GROUP BY date
        )
        SELECT 
            (SELECT avg_ce FROM daily_stats WHERE date = (SELECT max_d FROM latestpath)) as curr_ce,
            (SELECT avg_ce FROM daily_stats WHERE date = (SELECT max_d - 1 FROM latestpath)) as prev_ce,
            
            (SELECT cnt_optimal FROM daily_stats WHERE date = (SELECT max_d FROM latestpath)) as curr_opt,
            (SELECT cnt_optimal FROM daily_stats WHERE date = (SELECT max_d - 1 FROM latestpath)) as prev_opt,
            
            (SELECT cnt_warning FROM daily_stats WHERE date = (SELECT max_d FROM latestpath)) as curr_warn,
            (SELECT cnt_warning FROM daily_stats WHERE date = (SELECT max_d - 1 FROM latestpath)) as prev_warn,

            (SELECT cnt_critical FROM daily_stats WHERE date = (SELECT max_d FROM latestpath)) as curr_crit,
            (SELECT cnt_critical FROM daily_stats WHERE date = (SELECT max_d - 1 FROM latestpath)) as prev_crit
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, potline_id, source)

        if not row:
            return {
                "ce_trend": 0.0,
                "optimal_diff": 0,
                "warning_diff": 0,
                "critical_diff": 0,
            }

        def diff(curr, prev):
            return (curr or 0) - (prev or 0)

        # Calculate CE Trend
        curr_ce = row["curr_ce"] or 0
        prev_ce = row["prev_ce"] or 0
        ce_trend = float(curr_ce - prev_ce) if prev_ce > 0 else 0.0

        return {
            "ce_trend": ce_trend,
            "optimal_diff": diff(row["curr_opt"], row["prev_opt"]),
            "warning_diff": diff(row["curr_warn"], row["prev_warn"]),
            "critical_diff": diff(row["curr_crit"], row["prev_crit"]),
        }
