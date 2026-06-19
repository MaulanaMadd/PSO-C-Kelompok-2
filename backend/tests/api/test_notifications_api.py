"""
tests/api/test_notifications_api.py

API test untuk Notification endpoints:
  GET  /api/v1/notifications/
  POST /api/v1/notifications/
  PUT  /api/v1/notifications/{id}/read
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


def _make_notif_row(id=1, type="alert", title="Test", message="Msg", is_read=False):
    return {
        "id": id,
        "type": type,
        "title": title,
        "message": message,
        "is_read": is_read,
        "created_at": datetime(2024, 1, 15, 10, 0, 0),
    }


def _make_pool(fetch_result=None, fetchrow_result=None, execute_result="OK"):
    pool = MagicMock()
    pool.fetch = AsyncMock(return_value=fetch_result or [])
    pool.fetchrow = AsyncMock(return_value=fetchrow_result)
    pool.execute = AsyncMock(return_value=execute_result)
    return pool


# ============================================================
# GET /api/v1/notifications/
# ============================================================


class TestGetNotifications:
    def test_get_empty_notifications(self):
        pool = _make_pool(fetch_result=[])
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get("/api/v1/notifications/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_notifications_returns_list(self):
        rows = [_make_notif_row(1), _make_notif_row(2, title="Alert 2")]
        pool = _make_pool(fetch_result=rows)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get("/api/v1/notifications/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_get_notifications_with_limit(self):
        rows = [_make_notif_row(i) for i in range(3)]
        pool = _make_pool(fetch_result=rows)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get("/api/v1/notifications/?limit=3")
        assert resp.status_code == 200

    def test_get_notifications_invalid_limit_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.get("/api/v1/notifications/?limit=invalid")
        assert resp.status_code == 422

    def test_get_unread_notifications_only(self):
        rows = [_make_notif_row(1, is_read=False)]
        pool = _make_pool(fetch_result=rows)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get("/api/v1/notifications/?unread_only=true")
        assert resp.status_code == 200
        data = resp.json()
        for notif in data:
            assert notif["is_read"] is False

    def test_notification_has_required_fields(self):
        rows = [_make_notif_row(1)]
        pool = _make_pool(fetch_result=rows)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.get("/api/v1/notifications/")
        data = resp.json()
        if data:
            notif = data[0]
            assert "id" in notif
            assert "type" in notif
            assert "title" in notif
            assert "message" in notif
            assert "is_read" in notif
            assert "created_at" in notif


# ============================================================
# POST /api/v1/notifications/
# ============================================================


class TestCreateNotification:
    def test_create_alert_notification(self):
        row = _make_notif_row(
            1, type="alert", title="New Alert", message="Alert message"
        )
        pool = _make_pool(fetchrow_result=row)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/notifications/",
                    json={
                        "type": "alert",
                        "title": "New Alert",
                        "message": "Alert message",
                    },
                )
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "alert"
        assert data["title"] == "New Alert"
        assert data["is_read"] is False

    def test_create_info_notification(self):
        row = _make_notif_row(2, type="info", title="Info", message="Info msg")
        pool = _make_pool(fetchrow_result=row)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/notifications/",
                    json={
                        "type": "info",
                        "title": "Info",
                        "message": "Info msg",
                    },
                )
        assert resp.status_code == 200
        assert resp.json()["type"] == "info"

    def test_create_warning_notification(self):
        row = _make_notif_row(3, type="warning", title="Warn", message="Warning msg")
        pool = _make_pool(fetchrow_result=row)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/notifications/",
                    json={
                        "type": "warning",
                        "title": "Warn",
                        "message": "Warning msg",
                    },
                )
        assert resp.status_code == 200

    def test_create_missing_type_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/notifications/",
                json={
                    "title": "Test",
                    "message": "Test message",
                },
            )
        assert resp.status_code == 422

    def test_create_missing_title_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/notifications/",
                json={
                    "type": "alert",
                    "message": "Test message",
                },
            )
        assert resp.status_code == 422

    def test_create_missing_message_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(
                "/api/v1/notifications/",
                json={
                    "type": "alert",
                    "title": "Test",
                },
            )
        assert resp.status_code == 422

    def test_create_empty_body_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post("/api/v1/notifications/", json={})
        assert resp.status_code == 422

    def test_create_notification_has_id(self):
        row = _make_notif_row(42, type="alert", title="T", message="M")
        pool = _make_pool(fetchrow_result=row)
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    "/api/v1/notifications/",
                    json={
                        "type": "alert",
                        "title": "T",
                        "message": "M",
                    },
                )
        assert resp.json()["id"] == 42


# ============================================================
# PUT /api/v1/notifications/{id}/read
# ============================================================


class TestMarkNotificationAsRead:
    def test_mark_as_read_success(self):
        pool = _make_pool(execute_result="UPDATE 1")
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.put("/api/v1/notifications/1/read")
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

    def test_mark_as_read_different_id(self):
        pool = _make_pool(execute_result="UPDATE 1")
        with patch(
            "app.routers.notifications.get_pool", new=AsyncMock(return_value=pool)
        ):
            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.put("/api/v1/notifications/99/read")
        assert resp.status_code == 200

    def test_mark_as_read_invalid_id_type_returns_422(self):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.put("/api/v1/notifications/not_an_int/read")
        assert resp.status_code == 422
