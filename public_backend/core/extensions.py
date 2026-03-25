import pymysql
from pymysql.cursors import DictCursor

_db_config = None
_db_connection = None


def init_db(config):
    global _db_config
    _db_config = {
        "MYSQL_HOST": config["MYSQL_HOST"],
        "MYSQL_PORT": int(config["MYSQL_PORT"]),
        "MYSQL_USER": config["MYSQL_USER"],
        "MYSQL_PASS": config["MYSQL_PASS"],
        "MYSQL_DB": config["MYSQL_DB"],
    }


def _create_connection():
    if _db_config is None:
        raise RuntimeError("Database is not initialized. Call init_db(config) first.")

    return pymysql.connect(
        host=_db_config["MYSQL_HOST"],
        port=_db_config["MYSQL_PORT"],
        user=_db_config["MYSQL_USER"],
        password=_db_config["MYSQL_PASS"],
        database=_db_config["MYSQL_DB"],
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        connect_timeout=5,
    )


def get_db_connection():
    global _db_connection

    if _db_connection is None:
        _db_connection = _create_connection()
        return _db_connection

    try:
        _db_connection.ping(reconnect=True)
    except Exception:
        _db_connection = _create_connection()

    return _db_connection
