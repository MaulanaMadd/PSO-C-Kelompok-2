"""
tests/unit/test_auth_core.py

Unit test untuk fungsi-fungsi auth di app/auth.py:
  - get_password_hash / verify_password
  - create_access_token / decode via get_current_user
  - token expiry behavior
"""

from datetime import timedelta

import pytest
from jose import jwt

from app.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_password_hash,
    verify_password,
)

# ============================================================
# Password Hashing
# ============================================================


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = get_password_hash("mypassword")
        assert hashed != "mypassword"

    def test_hash_is_string(self):
        hashed = get_password_hash("mypassword")
        assert isinstance(hashed, str)

    def test_verify_correct_password(self):
        hashed = get_password_hash("correct_pass")
        assert verify_password("correct_pass", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("correct_pass")
        assert verify_password("wrong_pass", hashed) is False

    def test_different_hashes_for_same_password(self):
        """Argon2 menggunakan salt acak, jadi dua hash dari password yang sama berbeda."""
        h1 = get_password_hash("same_password")
        h2 = get_password_hash("same_password")
        assert h1 != h2

    def test_verify_empty_password(self):
        hashed = get_password_hash("")
        assert verify_password("", hashed) is True

    def test_verify_unicode_password(self):
        password = "p@ssw0rd_日本語"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True
        assert verify_password("wrong", hashed) is False


# ============================================================
# JWT Token Creation
# ============================================================


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token(data={"sub": "test@example.com"})
        assert isinstance(token, str)

    def test_token_has_three_parts(self):
        """JWT harus memiliki 3 bagian: header.payload.signature"""
        token = create_access_token(data={"sub": "test@example.com"})
        parts = token.split(".")
        assert len(parts) == 3

    def test_token_contains_subject(self):
        token = create_access_token(data={"sub": "user@example.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "user@example.com"

    def test_token_contains_expiry(self):
        token = create_access_token(data={"sub": "user@example.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_custom_expiry(self):
        import time

        expires = timedelta(minutes=1)
        token = create_access_token(
            data={"sub": "test@example.com"}, expires_delta=expires
        )
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Expiry seharusnya ~60 detik dari sekarang
        assert payload["exp"] > int(time.time())
        assert payload["exp"] < int(time.time()) + 120  # toleransi 2 menit

    def test_default_expiry_applies(self):
        import time

        token = create_access_token(data={"sub": "test@example.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        expected_exp_min = int(time.time()) + (ACCESS_TOKEN_EXPIRE_MINUTES - 1) * 60
        expected_exp_max = int(time.time()) + (ACCESS_TOKEN_EXPIRE_MINUTES + 1) * 60
        assert expected_exp_min <= payload["exp"] <= expected_exp_max

    def test_additional_claims_preserved(self):
        token = create_access_token(data={"sub": "user@example.com", "role": "admin"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["role"] == "admin"

    def test_different_tokens_for_same_data(self):
        """Token seharusnya berbeda karena waktu exp berbeda (1 detik)."""
        import time

        t1 = create_access_token(data={"sub": "test@example.com"})
        time.sleep(1)
        t2 = create_access_token(data={"sub": "test@example.com"})
        assert t1 != t2


# ============================================================
# get_current_user (async, diuji via token decode langsung)
# ============================================================


class TestTokenDecode:
    def test_valid_token_decodes_correctly(self):
        token = create_access_token(data={"sub": "admin@example.com"})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "admin@example.com"

    def test_tampered_token_raises(self):
        from jose import JWTError

        token = create_access_token(data={"sub": "test@example.com"})
        # Rusak signature
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            jwt.decode(tampered, SECRET_KEY, algorithms=[ALGORITHM])

    def test_wrong_secret_raises(self):
        from jose import JWTError

        token = create_access_token(data={"sub": "test@example.com"})
        with pytest.raises(JWTError):
            jwt.decode(token, "wrong_secret", algorithms=[ALGORITHM])

    def test_expired_token_raises(self):
        token = create_access_token(
            data={"sub": "test@example.com"},
            expires_delta=timedelta(seconds=-1),  # sudah expired
        )
        with pytest.raises(Exception):  # ExpiredSignatureError atau JWTError
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
