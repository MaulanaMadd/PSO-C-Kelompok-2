import os
import asyncpg
from dotenv import load_dotenv
from pathlib import Path
import logging

# Explicitly load .env from the backend root directory
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

print("=" * 50)
print("DATABASE_URL EXISTS:", DATABASE_URL is not None)

if DATABASE_URL:
    print("DATABASE_URL LENGTH:", len(DATABASE_URL))
    print("DATABASE_URL HOST:", DATABASE_URL.split("@")[-1])

print("=" * 50)

# Setup logging
logging.basicConfig(filename='backend_debug.log', level=logging.INFO, 
                    format='%(asctime)s %(levelname)s:%(message)s')

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        try:
            logging.info(f"Connecting to DB: {DATABASE_URL}")
            _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
            logging.info("DB Connection successful")
        except Exception as e:
            logging.error(f"DB Connection failed: {e}")
            raise e
    return _pool

async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
