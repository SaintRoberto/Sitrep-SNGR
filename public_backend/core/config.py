import os


class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    
# MySQL configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_DB = os.getenv("MYSQL_DB", "")
    MYSQL_USER = os.getenv("MYSQL_USER", "")
    MYSQL_PASS = os.getenv("MYSQL_PASS", "")

# PostgreSQL configuration
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "")
    POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB = os.getenv("POSTGRES_DB", "")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "")
    POSTGRES_PASS = os.getenv("POSTGRES_PASS", "")
    POSTGRES_SSLMODE = os.getenv("POSTGRES_SSLMODE", "")

    PUBLIC_API_KEYS = [
        key.strip()
        for key in os.getenv("PUBLIC_API_KEYS", "").split(",")
        if key.strip()
    ]

    _frontend_origins_env = os.getenv("FRONTEND_ORIGINS", "")
    FRONTEND_ORIGINS = [origin.strip() for origin in _frontend_origins_env.split(",") if origin.strip()]
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
