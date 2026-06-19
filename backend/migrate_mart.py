import asyncio

import asyncpg

# Use the specific URL we found earlier
DATABASE_URL = "postgresql://postgres:IXPjRinFrYRaNIrjRGrkDVSxjaQpEZcV@trolley.proxy.rlwy.net:34796/railway"

MIGRATION_SQL = """
BEGIN;

-- 1. Drop existing table
DROP TABLE IF EXISTS mart.pot_params_daily CASCADE;

-- 2. Create new table using structure from raw (copying structure including defaults/types)
--    We use LIKE to copy structure. We can also just 'CREATE TABLE AS' but we want to ensure constraints and indexes are manageable.
--    Actually 'CREATE TABLE AS SELECT * FROM raw.pot_daily WITH NO DATA' is easiest to get all columns.
CREATE TABLE mart.pot_params_daily AS 
SELECT * FROM raw.pot_daily WITH NO DATA;

-- 3. Add Primary Key
ALTER TABLE mart.pot_params_daily ADD PRIMARY KEY (date, pot_id);

-- 4. Create Index (restore existing index)
CREATE INDEX idx_pot_params_daily_pot_date ON mart.pot_params_daily(pot_id, date DESC);

-- 5. Populate Data
INSERT INTO mart.pot_params_daily
SELECT * FROM raw.pot_daily
WHERE pot_id IS NOT NULL;

COMMIT;
"""


async def run_migration():
    print("Starting migration...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute(MIGRATION_SQL)
        print(
            "Migration successful: mart.pot_params_daily synchronized with raw.pot_daily"
        )
        await conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")


if __name__ == "__main__":
    asyncio.run(run_migration())
