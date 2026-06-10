from asyncpg import Connection, Pool


class BaseRepo:
    def __init__(self, pool: Pool):
        self.pool = pool

    async def get_connection(self) -> Connection:
        return self.pool.acquire()
