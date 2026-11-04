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
ENV = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or "development").strip().lower()
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Comma-separated CORS origins (Strictly restricted in production to https://aayam.vercel.app)
_default_cors = "https://aayam.vercel.app" if ENV == "production" else "http://localhost:5173,http://127.0.0.1:5173"
_cors_raw = os.getenv("CORS_ORIGINS", _default_cors)
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

# Origin regex: disabled by default in production to prevent arbitrary Vercel preview domains
_cors_regex_raw = os.getenv("CORS_ORIGIN_REGEX", "").strip()
CORS_ORIGIN_REGEX = _cors_regex_raw if _cors_regex_raw else None

# Database URL configuration (Supports SQLite & PostgreSQL)
_supabase_pwd = os.getenv("SUPABASE_DB_PASSWORD", "").strip()
_raw_db = os.getenv("DATABASE_URL", "").strip()

if _supabase_pwd and _supabase_pwd not in ["[YOUR_ACTUAL_PASSWORD]", "YOUR_PASSWORD"]:
    from urllib.parse import quote_plus
    _escaped_pwd = quote_plus(_supabase_pwd)
    DATABASE_URL = f"postgresql://postgres.dahgvnzokjpieadtvqrj:{_escaped_pwd}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
elif _raw_db and not _raw_db.startswith("sqlite") and ("[YOUR_ACTUAL_PASSWORD]" in _raw_db or "YOUR_PASSWORD" in _raw_db):
    # Fallback to local SQLite if placeholder password is detected in development
    DATABASE_URL = f"sqlite:///{BASE_DIR}/aayam_infra.db"
elif _raw_db:
    if _raw_db.startswith("sqlite:///."):
        DATABASE_URL = f"sqlite:///{BASE_DIR}/{_raw_db[12:]}" if _raw_db.startswith("sqlite:///./") else f"sqlite:///{BASE_DIR}/{_raw_db[11:]}"
    elif _raw_db.startswith("postgres://"):
        DATABASE_URL = _raw_db.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = _raw_db
else:
    DATABASE_URL = f"sqlite:///{BASE_DIR}/aayam_infra.db"

# Auto-append sslmode=require for Supabase PostgreSQL connections if omitted
if ("supabase.co" in DATABASE_URL or "supabase.com" in DATABASE_URL) and "sslmode=" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

# Storage Directories (Local Cache & Ephemeral Fallback)
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", DATA_DIR / "media"))
EVIDENCE_DIR = Path(os.getenv("EVIDENCE_DIR", DATA_DIR / "evidence"))

# Supabase Storage Configuration (Free Tier Remote Object Storage)
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "").strip()
SUPABASE_STORAGE_BUCKET_MEDIA = os.getenv("SUPABASE_STORAGE_BUCKET_MEDIA", "aayam-media")
SUPABASE_STORAGE_BUCKET_EVIDENCE = os.getenv("SUPABASE_STORAGE_BUCKET_EVIDENCE", "aayam-evidence")

# ==============================================================================
# JWT AUTHENTICATION CONFIGURATION & SECURITY VALIDATION
# ==============================================================================
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # Default: 8 hours

_jwt_secret = os.getenv("JWT_SECRET_KEY", "").strip()

if ENV == "production":
    if not _jwt_secret or len(_jwt_secret) < 32 or _jwt_secret.startswith("your_") or "secret" in _jwt_secret.lower():
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: "
            "JWT_SECRET_KEY is missing, too short (<32 chars), or uses an insecure placeholder in production. "
            "Please configure a persistent, cryptographically secure 256-bit secret in your Render environment."
        )
    JWT_SECRET_KEY = _jwt_secret
else:
    # Development or Testing environment
    if not _jwt_secret or _jwt_secret.startswith("your_"):
        import secrets
        _cached_dev_key = os.getenv("_AAYAM_DEV_RANDOM_JWT_KEY")
        if not _cached_dev_key:
            _cached_dev_key = secrets.token_hex(32)
            os.environ["_AAYAM_DEV_RANDOM_JWT_KEY"] = _cached_dev_key
        JWT_SECRET_KEY = _cached_dev_key
    else:
        JWT_SECRET_KEY = _jwt_secret

