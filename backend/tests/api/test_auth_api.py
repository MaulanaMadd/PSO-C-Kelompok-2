"""
tests/api/test_auth_api.py

API test untuk endpoint authentication:
  POST /api/v1/auth/signup
  POST /api/v1/auth/login
  GET  /api/v1/auth/me
  PUT  /api/v1/auth/me

Menggunakan mock DB pool dari conftest.py — tidak butuh PostgreSQL live.
"""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app import auth as auth_module
from app.main import app

# Konstanta test
TEST_EMAIL = "api_test@example.com"
TEST_PASSWORD = "testpassword123"
TEST_NAME = "API Test User"


def _make_user_row(email=TEST_EMAIL, name=TEST_NAME, password=TEST_PASSWORD):
    """Buat mock asyncpg record yang menyerupai row dari tabel users."""
    return {
        "id": 1,
        "email": email,
        "full_name": name,
        "hashed_password": auth_module.get_password_hash(password),
        "role": "user",
        "phone": None,
    }


def _make_client(mock_conn):
    """Helper — buat TestClient dengan mock pool yang menggunakan mock_conn."""
    pool = MagicMock()
    cm = AsyncMock()
    cm.__aenter__ = AsyncMock(return_value=mock_conn)
    cm.__aexit__ = AsyncMock(return_value=None)
    pool.acquire.return_value = cm
    pool.fetch = AsyncMock(return_value=[])
    pool.fetchrow = AsyncMock(return_value=None)
    pool.execute = AsyncMock(return_value="OK")
    return pool


# ============================================================
# POST /api/v1/auth/signup
# ============================================================


class TestSignupEndpoint:
    def test_signup_new_user_success(self, mock_conn):
        user_row = _make_user_row()
        mock_conn.fetchval.return_value = None  # email belum ada
        mock_conn.fetchrow.return_value = user_row

        pool = _make_client(mock_conn)
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/auth/signup",
                    json={
                        "email": TEST_EMAIL,
                        "password": TEST_PASSWORD,
                        "full_name": TEST_NAME,
                    },
                )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == TEST_EMAIL
        assert data["full_name"] == TEST_NAME
        assert "id" in data
        assert "role" in data

    def test_signup_duplicate_email_returns_400(self, mock_conn):
        mock_conn.fetchval.return_value = 1  # email sudah ada

        pool = _make_client(mock_conn)
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/auth/signup",
                    json={
                        "email": TEST_EMAIL,
                        "password": TEST_PASSWORD,
                        "full_name": TEST_NAME,
                    },
                )
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    def test_signup_missing_email_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/auth/signup",
                json={
                    "password": TEST_PASSWORD,
                    "full_name": TEST_NAME,
                },
            )
        assert resp.status_code == 422

    def test_signup_missing_password_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/auth/signup",
                json={
                    "email": TEST_EMAIL,
                    "full_name": TEST_NAME,
                },
            )
        assert resp.status_code == 422

    def test_signup_missing_full_name_uses_none(self, mock_conn):
        user_row = {**_make_user_row(), "full_name": None}
        mock_conn.fetchval.return_value = None
        mock_conn.fetchrow.return_value = user_row

        pool = _make_client(mock_conn)
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/auth/signup",
                    json={
                        "email": TEST_EMAIL,
                        "password": TEST_PASSWORD,
                    },
                )
        assert resp.status_code == 200

    def test_signup_empty_body_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post("/api/v1/auth/signup", json={})
        assert resp.status_code == 422


# ============================================================
# POST /api/v1/auth/login
# ============================================================


class TestLoginEndpoint:
    def test_login_success_returns_token(self, mock_conn):
        user_row = _make_user_row()
        mock_conn.fetchrow.return_value = user_row

        pool = _make_client(mock_conn)
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/auth/login",
                    data={
                        "username": TEST_EMAIL,
                        "password": TEST_PASSWORD,
                    },
                )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, mock_conn):
        user_row = _make_user_row()
        mock_conn.fetchrow.return_value = user_row

        pool = _make_client(mock_conn)
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/auth/login",
                    data={
                        "username": TEST_EMAIL,
                        "password": "wrong_password",
                    },
                )
        assert resp.status_code == 401
        assert "incorrect" in resp.json()["detail"].lower()

    def test_login_nonexistent_user_returns_401(self, mock_conn):
        mock_conn.fetchrow.return_value = None  # user tidak ada

        pool = _make_client(mock_conn)
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/auth/login",
                    data={
                        "username": "ghost@example.com",
                        "password": "anypassword",
                    },
                )
        assert resp.status_code == 401

    def test_login_missing_username_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/auth/login",
                data={
                    "password": TEST_PASSWORD,
                },
            )
        assert resp.status_code == 422

    def test_login_missing_password_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/auth/login",
                data={
                    "username": TEST_EMAIL,
                },
            )
        assert resp.status_code == 422


# ============================================================
# GET /api/v1/auth/me
# ============================================================


class TestGetMeEndpoint:
    def _token(self, email=TEST_EMAIL):
        return auth_module.create_access_token(data={"sub": email})

    def test_get_me_with_valid_token(self, mock_conn):
        user_row = _make_user_row()
        mock_conn.fetchrow.return_value = user_row

        pool = _make_client(mock_conn)
        token = self._token()
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == TEST_EMAIL
        assert "id" in data
        assert "role" in data

    def test_get_me_without_token_returns_401_or_403(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.get("/api/v1/auth/me")
        assert resp.status_code in [401, 403]

    def test_get_me_with_invalid_token_returns_401(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer invalid.token.value"},
            )
        assert resp.status_code == 401

    def test_get_me_user_not_found_returns_404(self, mock_conn):
        mock_conn.fetchrow.return_value = None  # user tidak ada di DB

        pool = _make_client(mock_conn)
        token = self._token()
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert resp.status_code == 404


# ============================================================
# PUT /api/v1/auth/me
# ============================================================


class TestUpdateMeEndpoint:
    def _token(self, email=TEST_EMAIL):
        return auth_module.create_access_token(data={"sub": email})

    def test_update_full_name(self, mock_conn):
        updated_row = {**_make_user_row(), "full_name": "Updated Name"}
        mock_conn.fetchrow.return_value = updated_row

        pool = _make_client(mock_conn)
        token = self._token()
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.put(
                    "/api/v1/auth/me",
                    json={"full_name": "Updated Name"},
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_update_phone(self, mock_conn):
        updated_row = {**_make_user_row(), "phone": "+62812345678"}
        mock_conn.fetchrow.return_value = updated_row

        pool = _make_client(mock_conn)
        token = self._token()
        with patch("app.db.get_pool", new=AsyncMock(return_value=pool)):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.put(
                    "/api/v1/auth/me",
                    json={"phone": "+62812345678"},
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert resp.status_code == 200

    def test_update_without_token_returns_401_or_403(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.put("/api/v1/auth/me", json={"full_name": "New"})
        assert resp.status_code in [401, 403]
