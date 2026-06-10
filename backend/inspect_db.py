import asyncio

import asyncpg

DATABASE_URL = "postgresql://postgres:IXPjRinFrYRaNIrjRGrkDVSxjaQpEZcV@trolley.proxy.rlwy.net:34796/railway"


async def inspect():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        rows = await conn.fetch(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'mart' AND table_name = 'pot_params_daily';"
        )
        print("Columns in mart.pot_params_daily:")
        target_cols = ["psp", "ae_dur"]
        found_cols = []
        for r in rows:
            if r["column_name"] in target_cols:
                found_cols.append(r["column_name"])

        print(f"Found required columns: {found_cols}")
        if len(found_cols) == 2:
            print("SUCCESS: Both columns found.")
        else:
            print("MISSING columns!")
            # Dump all just in case
            # for r in rows: print(r['column_name'])
        await conn.close()

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(inspect())
