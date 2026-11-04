import os
import importlib
import logging
import pytest
from unittest.mock import patch
from pathlib import Path


def test_production_jwt_secret_validation_rejects_missing():
    """Verifies that production mode rejects missing JWT_SECRET_KEY."""
    from app import config
    with patch.object(Path, "exists", return_value=False):
        with patch.dict(os.environ, {"ENV": "production", "JWT_SECRET_KEY": ""}):
            with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
                importlib.reload(config)


def test_production_jwt_secret_validation_rejects_short():
    """Verifies that production mode rejects keys shorter than 32 characters."""
    from app import config
    with patch.object(Path, "exists", return_value=False):
        with patch.dict(os.environ, {"ENV": "production", "JWT_SECRET_KEY": "too_short_key_under_32_chars"}):
            with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
                importlib.reload(config)


def test_production_jwt_secret_validation_rejects_placeholder():
    """Verifies that production mode rejects known placeholders starting with 'your_'."""
    from app import config
    with patch.object(Path, "exists", return_value=False):
        with patch.dict(os.environ, {"ENV": "production", "JWT_SECRET_KEY": "your_secure_random_jwt_secret_key_here_more_than_32_chars"}):
            with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
                importlib.reload(config)


def test_production_jwt_secret_validation_accepts_valid_key_with_secret_word(caplog):
    """
    Verifies that a secure, high-entropy key containing the word 'secret'
    is NOT falsely rejected, fixing the false-positive rejection bug,
    and safe diagnostic logging reports presence and length without leaking the key.
    """
    from app import config
    valid_key = "aayam_production_secret_key_1234567890_abcdef1234567890_super_token"
    assert len(valid_key) == 67
    assert "secret" in valid_key.lower()

    with patch.object(Path, "exists", return_value=False):
        with caplog.at_level(logging.INFO, logger="aayam.config"):
            with patch.dict(os.environ, {"ENV": "production", "JWT_SECRET_KEY": valid_key}):
                importlib.reload(config)
                assert config.JWT_SECRET_KEY == valid_key

    # Check diagnostic log
    assert any("Production JWT_SECRET_KEY configuration check: present=True, length=67, valid_length=True, is_placeholder=False, validation_passed=True" in record.message for record in caplog.records)
    # Ensure the secret itself is NEVER printed in any log record
    for record in caplog.records:
        assert valid_key not in record.message

    # Reset config back to development
    with patch.dict(os.environ, {"ENV": "development", "JWT_SECRET_KEY": ""}):
        importlib.reload(config)
