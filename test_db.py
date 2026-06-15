import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:kelompok2@34.101.97.53:5432/optinadb')
    try:
        res = await conn.fetchval("""
            SELECT case
              when 'Tue Mar 31 2026 23:59:48 GMT+0700 (Western Indonesia Time)' like '%GMT%' then 
              to_timestamp(substring('Tue Mar 31 2026 23:59:48 GMT+0700 (Western Indonesia Time)' from 5 for 20), 'Mon DD YYYY HH24:MI:SS')::date
              else 'Tue Mar 31 2026 23:59:48'::date
            end
        """)
        print(f"Parsed Date: {res}")
    except Exception as e:
        print(f"Error: {e}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test())
