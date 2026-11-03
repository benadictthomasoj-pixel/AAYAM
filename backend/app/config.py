import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the backend
BASE_DIR = Path(__file__).resolve().parent.parent

def load_app_env():
    """Loads backend/.env if present, filtering out dummy placeholder keys."""
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        load_dotenv(env_file, override=True)
    # Clear out any placeholder keys like 'your_gemini_api_key_here'
    for k in ["OPENROUTER_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]:
        val = os.getenv(k)
        if val and (val.startswith("your_") or val == "your_api_key_here" or not val.strip()):
            os.environ.pop(k, None)

load_app_env()

APP_NAME = os.getenv("APP_NAME", "AAYAM Infrastructure Intelligence API")
ENV = os.getenv("ENV", "development")
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Comma-separated CORS origins
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"^https://.*\.vercel\.app$")

# Database URL configuration (Supports SQLite & PostgreSQL)
_raw_db = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/aayam_infra.db")
if _raw_db.startswith("sqlite:///."):
    DATABASE_URL = f"sqlite:///{BASE_DIR}/{_raw_db[12:]}" if _raw_db.startswith("sqlite:///./") else f"sqlite:///{BASE_DIR}/{_raw_db[11:]}"
elif _raw_db.startswith("postgres://"):
    # Render and Heroku default to postgres://; SQLAlchemy 2.0 requires postgresql://
    DATABASE_URL = _raw_db.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = _raw_db

# Storage Directories (Configurable for Render Persistent Disks)
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", DATA_DIR / "media"))
EVIDENCE_DIR = Path(os.getenv("EVIDENCE_DIR", DATA_DIR / "evidence"))

# ==============================================================================
# JWT AUTHENTICATION CONFIGURATION & SECURITY VALIDATION
# ==============================================================================
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # Default: 8 hours

_jwt_secret = os.getenv("JWT_SECRET_KEY", "").strip()

# Enforce strict secret security in production environments
if ENV == "production":
    if not _jwt_secret or len(_jwt_secret) < 32 or _jwt_secret.startswith("your_") or "secret" in _jwt_secret.lower():
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: "
            "JWT_SECRET_KEY is missing, too short (<32 chars), or uses an insecure placeholder in production. "
            "Please generate and set a cryptographically secure 256-bit secret in your production environment."
        )
    JWT_SECRET_KEY = _jwt_secret
else:
    # Development or Testing environment
    if not _jwt_secret or _jwt_secret.startswith("your_"):
        # Auto-generate a random secure secret per session if not configured in .env
        import secrets
        _cached_dev_key = os.getenv("_AAYAM_DEV_RANDOM_JWT_KEY")
        if not _cached_dev_key:
            _cached_dev_key = secrets.token_hex(32)
            os.environ["_AAYAM_DEV_RANDOM_JWT_KEY"] = _cached_dev_key
        JWT_SECRET_KEY = _cached_dev_key
    else:
        JWT_SECRET_KEY = _jwt_secret

