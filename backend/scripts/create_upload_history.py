import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_pool


async def create_table():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS public.upload_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR NOT NULL,
                uploaded_by VARCHAR NOT NULL,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Table public.upload_history created successfully.")


if __name__ == "__main__":
    asyncio.run(create_table())
