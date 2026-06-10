import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db import close_pool, get_pool


async def init_settings():
    print("Initializing KPI Standards Table...")

    # 1. Create Table (SQL)
    create_sql = """
    CREATE TABLE IF NOT EXISTS public.kpi_standards (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        unit TEXT,
        min_val NUMERIC,
        target_val NUMERIC,
        max_val NUMERIC,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(create_sql)
            print("Table 'kpi_standards' created or exists.")

            # 2. Seed Data
            seed_data = [
                ("ce", "Current Efficiency", "%", 90.0, 96.0, 100.0),
                ("bt", "Bath Temperature", "°C", 940.0, 950.0, 960.0),
                ("avv", "Voltage", "V", 4.1, 4.2, 4.4),
                ("noise", "Noise", "mV", 0.0, 10.0, 50.0),
                ("m", "Metal Level", "cm", 23.0, 25.0, 27.0),
                ("bath_tap", "Bath Level", "cm", 15.0, 20.0, 25.0),
                ("aef", "AE Frequency", "count/day", 0.0, 0.0, 0.5),
                ("ae_dur", "AE Duration", "s", 0.0, 0.0, 0.0),
                ("ae_kwh", "AE Energy", "kWh", 0.0, 0.0, 2.0),
                ("age_day", "Pot Age", "days", 0.0, 1500.0, 2500.0),
                ("fe", "Iron Content", "%", 0.0, 0.05, 0.20),
                ("si", "Silicon Content", "%", 0.0, 0.05, 0.20),
                ("sa", "Ratio", "", 0.0, 0.0, 0.0),
            ]

            for item in seed_data:
                key, label, unit, mn, tgt, mx = item
                upsert_sql = """
                INSERT INTO public.kpi_standards (key, label, unit, min_val, target_val, max_val, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    label = EXCLUDED.label,
                    unit = EXCLUDED.unit
                    -- We do NOT overwrite values on conflict to preserve user settings if they exist
                    -- UNLESS you want to force reset. Let's assume preserve.
                """
                # But if we added new columns or logic, maybe we should update?
                # For now getting it there is enough.

                await conn.execute(upsert_sql, key, label, unit, mn, tgt, mx)

        print("KPI Standards seeded successfully.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await close_pool()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(init_settings())
