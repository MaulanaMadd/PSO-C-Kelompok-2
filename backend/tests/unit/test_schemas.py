"""
tests/unit/test_schemas.py

Unit test untuk Pydantic schemas di app/schemas.py.
Tidak membutuhkan DB atau server — murni Python/Pydantic validation.
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas import (
    HealthResponse,
    KPIStandard,
    KPIStandardUpdate,
    PotlinesResponse,
    PotsResponse,
    SettingsResponse,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)

# ============================================================
# HealthResponse
# ============================================================


class TestHealthResponse:
    def test_valid_creation(self):
        obj = HealthResponse(status="ok", db="ok")
        assert obj.status == "ok"
        assert obj.db == "ok"

    def test_db_error_status(self):
        obj = HealthResponse(status="ok", db="error")
        assert obj.db == "error"

    def test_missing_status_raises(self):
        with pytest.raises(ValidationError):
            HealthResponse(db="ok")

    def test_missing_db_raises(self):
        with pytest.raises(ValidationError):
            HealthResponse(status="ok")

    def test_serializes_to_dict(self):
        obj = HealthResponse(status="ok", db="ok")
        d = obj.model_dump()
        assert d == {"status": "ok", "db": "ok"}


# ============================================================
# UserCreate
# ============================================================


class TestUserCreate:
    def test_valid_full(self):
        user = UserCreate(
            email="test@example.com", password="pass123", full_name="John Doe"
        )
        assert user.email == "test@example.com"
        assert user.full_name == "John Doe"

    def test_full_name_optional(self):
        user = UserCreate(email="test@example.com", password="pass123")
        assert user.full_name is None

    def test_missing_email_raises(self):
        with pytest.raises(ValidationError):
            UserCreate(password="pass123")

    def test_missing_password_raises(self):
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com")

    def test_email_as_string(self):
        # Pydantic tidak memvalidasi format email kecuali pakai EmailStr
        user = UserCreate(email="not-an-email", password="pass")
        assert user.email == "not-an-email"


# ============================================================
# UserResponse
# ============================================================


class TestUserResponse:
    def test_valid_creation(self):
        user = UserResponse(id=1, email="test@example.com", role="user")
        assert user.id == 1
        assert user.role == "user"
        assert user.full_name is None
        assert user.phone is None

    def test_full_fields(self):
        user = UserResponse(
            id=42,
            email="admin@example.com",
            full_name="Admin User",
            phone="+628123456789",
            role="admin",
        )
        assert user.full_name == "Admin User"
        assert user.phone == "+628123456789"

    def test_missing_id_raises(self):
        with pytest.raises(ValidationError):
            UserResponse(email="test@example.com", role="user")

    def test_missing_role_raises(self):
        with pytest.raises(ValidationError):
            UserResponse(id=1, email="test@example.com")


# ============================================================
# UserUpdate
# ============================================================


class TestUserUpdate:
    def test_all_optional(self):
        update = UserUpdate()
        assert update.full_name is None
        assert update.phone is None

    def test_partial_update(self):
        update = UserUpdate(full_name="New Name")
        assert update.full_name == "New Name"
        assert update.phone is None

    def test_full_update(self):
        update = UserUpdate(full_name="New Name", phone="+62812345")
        assert update.phone == "+62812345"


# ============================================================
# Token
# ============================================================


class TestToken:
    def test_valid_token(self):
        token = Token(access_token="abc123xyz", token_type="bearer")
        assert token.access_token == "abc123xyz"
        assert token.token_type == "bearer"

    def test_missing_access_token_raises(self):
        with pytest.raises(ValidationError):
            Token(token_type="bearer")

    def test_missing_token_type_raises(self):
        with pytest.raises(ValidationError):
            Token(access_token="abc123")


# ============================================================
# KPIStandard
# ============================================================


class TestKPIStandard:
    def test_valid_full(self):
        kpi = KPIStandard(
            key="bt",
            label="Bath Temperature",
            unit="°C",
            min_val=930.0,
            target_val=960.0,
            max_val=975.0,
        )
        assert kpi.key == "bt"
        assert kpi.min_val == 930.0
        assert kpi.target_val == 960.0
        assert kpi.max_val == 975.0

    def test_optional_fields_default_none(self):
        kpi = KPIStandard(key="bt", label="BT")
        assert kpi.unit is None
        assert kpi.min_val is None
        assert kpi.max_val is None
        assert kpi.updated_at is None

    def test_missing_key_raises(self):
        with pytest.raises(ValidationError):
            KPIStandard(label="BT")

    def test_missing_label_raises(self):
        with pytest.raises(ValidationError):
            KPIStandard(key="bt")

    def test_numeric_fields_accept_int(self):
        kpi = KPIStandard(
            key="bt", label="BT", min_val=900, target_val=960, max_val=980
        )
        assert kpi.min_val == 900.0  # coerced to float
        assert isinstance(kpi.min_val, float)

    def test_with_updated_at(self):
        ts = datetime(2024, 1, 15, 10, 30, 0)
        kpi = KPIStandard(key="ce", label="CE", updated_at=ts)
        assert kpi.updated_at == ts


# ============================================================
# KPIStandardUpdate
# ============================================================


class TestKPIStandardUpdate:
    def test_key_required(self):
        with pytest.raises(ValidationError):
            KPIStandardUpdate(min_val=100.0)

    def test_all_optional_except_key(self):
        upd = KPIStandardUpdate(key="bt")
        assert upd.key == "bt"
        assert upd.min_val is None

    def test_partial_update(self):
        upd = KPIStandardUpdate(key="bt", min_val=920.0)
        assert upd.min_val == 920.0
        assert upd.target_val is None


# ============================================================
# SettingsResponse
# ============================================================


class TestSettingsResponse:
    def test_empty_standards(self):
        resp = SettingsResponse(standards=[])
        assert resp.standards == []

    def test_with_standards(self):
        kpi = KPIStandard(key="bt", label="BT")
        resp = SettingsResponse(standards=[kpi])
        assert len(resp.standards) == 1
        assert resp.standards[0].key == "bt"

    def test_missing_standards_raises(self):
        with pytest.raises(ValidationError):
            SettingsResponse()


# ============================================================
# PotsResponse / PotlinesResponse
# ============================================================


class TestPotsResponse:
    def test_valid(self):
        resp = PotsResponse(potline_id=1, pots=[101, 102, 103])
        assert resp.potline_id == 1
        assert len(resp.pots) == 3

    def test_optional_potline_id(self):
        resp = PotsResponse(potline_id=None, pots=[])
        assert resp.potline_id is None

    def test_missing_pots_raises(self):
        with pytest.raises(ValidationError):
            PotsResponse(potline_id=1)


class TestPotlinesResponse:
    def test_valid(self):
        resp = PotlinesResponse(potlines=[1, 2, 3])
        assert len(resp.potlines) == 3

    def test_empty_list(self):
        resp = PotlinesResponse(potlines=[])
        assert resp.potlines == []
