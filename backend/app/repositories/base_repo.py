from asyncpg import Connection, Pool
from fastapi import Depends
from ..db import get_pool

class BaseRepo:
    def __init__(self, pool: Pool):
        self.pool = pool

    async def get_connection(self) -> Connection:
        return self.pool.acquire()
