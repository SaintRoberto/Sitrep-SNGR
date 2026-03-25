import os


class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_DB = os.getenv("MYSQL_DB", "")
    MYSQL_USER = os.getenv("MYSQL_USER", "")
    MYSQL_PASS = os.getenv("MYSQL_PASS", "")

    PUBLIC_API_KEYS = [
        key.strip()
        for key in os.getenv("PUBLIC_API_KEYS", "").split(",")
        if key.strip()
    ]

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    FRONTEND_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:3000,http://localhost:5173",
        ).split(",")
        if origin.strip()
    ]

    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
