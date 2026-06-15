import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_pool


async def update_data():
    pool = await get_pool()
    async with pool.acquire() as conn:
        # get a user email
        user_email = await conn.fetchval("SELECT email FROM public.users LIMIT 1")
        if not user_email:
            user_email = "admin@optina.com"

        await conn.execute(
            """
            UPDATE public.upload_history 
            SET uploaded_by = $1 
            WHERE uploaded_by = 'System' OR uploaded_by IS NULL
        """,
            user_email,
        )
        print(f"Updated all 'System' records to {user_email}.")


if __name__ == "__main__":
    asyncio.run(update_data())
