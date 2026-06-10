"""
conftest.py — Shared fixtures untuk seluruh test suite backend.

Menyediakan:
  - mock_pool / mock_conn: mock asyncpg connection pool & connection
  - auth_token / auth_headers: JWT bearer token untuk endpoint terproteksi
  - sample_* fixtures: data seed yang konsisten di semua test
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app import auth as auth_module
from app.main import app

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_token(email: str = "testuser@example.com") -> str:
    """Buat JWT token yang valid menggunakan auth module asli."""
    return auth_module.create_access_token(data={"sub": email})


# ---------------------------------------------------------------------------
# Mock DB fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_conn():
    """Mock asyncpg connection dengan semua metode async yang umum dipakai."""
    conn = MagicMock()
    conn.fetchrow = AsyncMock(return_value=None)
    conn.fetchval = AsyncMock(return_value=None)
    conn.fetch = AsyncMock(return_value=[])
    conn.execute = AsyncMock(return_value="OK")
    return conn


@pytest.fixture
def mock_pool(mock_conn):
    """Mock asyncpg Pool yang mengembalikan mock_conn via context manager."""
    pool = MagicMock()

    # pool.acquire() digunakan sebagai async context manager
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=mock_conn)
    cm.__aexit__ = AsyncMock(return_value=None)
    pool.acquire = MagicMock(return_value=cm)

    # pool.fetch / pool.fetchrow langsung (dipakai di notifications router)
    pool.fetch = AsyncMock(return_value=[])
    pool.fetchrow = AsyncMock(return_value=None)
    pool.execute = AsyncMock(return_value="OK")

    return pool


# ---------------------------------------------------------------------------
# Auth fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def auth_token():
    """JWT bearer token yang valid untuk user test."""
    return _make_token("testuser@example.com")


@pytest.fixture
def auth_headers(auth_token):
    """Header Authorization siap pakai."""
    return {"Authorization": f"Bearer {auth_token}"}


# ---------------------------------------------------------------------------
# Sample data fixtures
# ---------------------------------------------------------------------------

TEST_USER_EMAIL = "testuser@example.com"
TEST_USER_PASSWORD = "securepassword123"
TEST_USER_NAME = "Test User"


@pytest.fixture
def sample_user_record():
    """asyncpg-like user row dict."""
    return {
        "id": 1,
        "email": TEST_USER_EMAIL,
        "full_name": TEST_USER_NAME,
        "hashed_password": auth_module.get_password_hash(TEST_USER_PASSWORD),
        "role": "user",
        "phone": None,
    }


@pytest.fixture
def sample_notification_record():
    """asyncpg-like notification row dict."""
    return {
        "id": 1,
        "type": "alert",
        "title": "Test Alert",
        "message": "This is a test notification",
        "is_read": False,
        "created_at": datetime(2024, 1, 15, 10, 0, 0),
    }


@pytest.fixture
def sample_kpi_standard_record():
    """asyncpg-like kpi_standard row dict."""
    return {
        "key": "bt",
        "label": "Bath Temperature",
        "unit": "°C",
        "min_val": 930.0,
        "target_val": 960.0,
        "max_val": 975.0,
        "updated_at": datetime(2024, 1, 1, 0, 0, 0),
    }


# ---------------------------------------------------------------------------
# Test client dengan DB mock global
# ---------------------------------------------------------------------------


@pytest.fixture
def client(mock_pool):
    """
    FastAPI TestClient dengan mock DB pool.

    Semua endpoint yang memanggil `db.get_pool()` akan mendapatkan mock_pool
    sehingga test tidak bergantung pada koneksi PostgreSQL sungguhan.
    """
    with patch("app.db.get_pool", return_value=AsyncMock(return_value=mock_pool)) as _:
        # startup event mencoba konek DB, kita bypass dengan mock
        with patch("app.db._pool", mock_pool):
            with TestClient(app, raise_server_exceptions=False) as c:
                yield c


@pytest.fixture
def client_with_conn(mock_pool, mock_conn):
    """Client + akses langsung ke mock_conn untuk setup return value per-test."""
    with patch("app.db.get_pool", return_value=AsyncMock(return_value=mock_pool)):
        with patch("app.db._pool", mock_pool):
            with TestClient(app, raise_server_exceptions=False) as c:
                yield c, mock_conn
