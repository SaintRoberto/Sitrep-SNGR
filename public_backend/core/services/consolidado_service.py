from datetime import date, datetime, time, timedelta
from decimal import Decimal

import pymysql
from pymysql.cursors import DictCursor

from flask import current_app


class ConsolidadoServiceError(Exception):
    def __init__(self, message, details=None, status_code=500):
        super().__init__(message)
        self.details = details or {}
        self.status_code = status_code


def _to_json_safe(value):
    if isinstance(value, dict):
        return {key: _to_json_safe(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_to_json_safe(item) for item in value]
    if isinstance(value, Decimal):
        if value == value.to_integral_value():
            return int(value)
        return float(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        sign = "-" if total_seconds < 0 else ""
        total_seconds = abs(total_seconds)
        hours, rem = divmod(total_seconds, 3600)
        minutes, seconds = divmod(rem, 60)
        return f"{sign}{hours:02}:{minutes:02}:{seconds:02}"
    return value


PAYLOAD_COLUMNS = [
    "provincia",
    "canton",
    "parroquia",
    "sector",
    "fechareporte",
    "horareporte",
    "tipo",
    "nombrerio",
    "estado",
    "fechadesbordamiento",
    "antecedente",
    "acciones",
    "responsableregistro",
    "observaciones",
    "codigormnacional",
    "codigormnacional2",
    "novedadgeoglows",
    "fechanovedadgeoglows",
    "latitudlongitud",
    "personasfallecidas",
    "personasheridas",
    "familiasafectadas",
    "personasafectadas",
    "familiasdamnificadas",
    "personasdamnificadas",
    "personasfallecidas2",
    "personasheridas2",
    "familiasafectadasev2",
    "personasafectadasev2",
    "familiasdamnificadasev2",
    "personasdamnificadasev2",
    "personasfallecidas3",
    "personasheridas3",
    "familiasafectadasev3",
    "personasafectadasev3",
    "familiasdamnificadasev3",
    "personasdamnificadasev3",
    "personasfallecidas4",
    "personasheridas4",
    "familiasafectadasev4",
    "personasafectadasev4",
    "familiasdamnificadasev4",
    "personasdamnificadasev4",
    "anio",
    "desbordado",
    "totalpersonasfallecidas",
    "totalpersonasheridas",
    "totalfamiliasafectadas",
    "totalpersonasafectadas",
    "totalfamiliasdamnificadas",
    "totalpersonasdamnificadas",
    "latitud",
    "longitud",
    "causa",
    "evento",
    "mesdesbordado",
    "provinciagm",
    "ubicacion2",
]


def _get_connection():
    host = (current_app.config.get("MYSQL_CONSOLIDADO_HOST") or current_app.config.get("MYSQL_HOST") or "").strip()
    port = int(current_app.config.get("MYSQL_CONSOLIDADO_PORT") or current_app.config.get("MYSQL_PORT") or 3306)
    database = (current_app.config.get("MYSQL_CONSOLIDADO_DB") or current_app.config.get("MYSQL_DB") or "").strip()
    user = (current_app.config.get("MYSQL_CONSOLIDADO_USER") or current_app.config.get("MYSQL_USER") or "").strip()
    password = (current_app.config.get("MYSQL_CONSOLIDADO_PASS") or current_app.config.get("MYSQL_PASS") or "").strip()

    missing = [
        key
        for key, value in {
            "MYSQL_CONSOLIDADO_HOST": host,
            "MYSQL_CONSOLIDADO_DB": database,
            "MYSQL_CONSOLIDADO_USER": user,
            "MYSQL_CONSOLIDADO_PASS": password,
        }.items()
        if not value
    ]

    if missing:
        raise ConsolidadoServiceError(
            "MySQL configuration for consolidado is incomplete",
            details={
                "config_error": "Missing MySQL settings",
                "missing": missing,
                "accepted": [
                    "MYSQL_CONSOLIDADO_HOST",
                    "MYSQL_CONSOLIDADO_PORT",
                    "MYSQL_CONSOLIDADO_DB",
                    "MYSQL_CONSOLIDADO_USER",
                    "MYSQL_CONSOLIDADO_PASS",
                ],
                "fallback": [
                    "MYSQL_HOST",
                    "MYSQL_PORT",
                    "MYSQL_USER",
                    "MYSQL_PASS",
                ],
            },
            status_code=500,
        )

    try:
        return pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=True,
            connect_timeout=5,
        )
    except pymysql.MySQLError as db_error:
        raise ConsolidadoServiceError(
            "MySQL connection failed",
            details={"mysql_error": str(db_error)},
            status_code=500,
        ) from db_error


def create_consolidado(payload):
    if not isinstance(payload, dict):
        raise ConsolidadoServiceError(
            "Payload must be a JSON object",
            details={"validation_error": "Invalid payload type"},
            status_code=400,
        )

    unknown_fields = [
        key for key in payload.keys() if key not in set(PAYLOAD_COLUMNS) and key != "id"
    ]
    if unknown_fields:
        raise ConsolidadoServiceError(
            "Payload contains unknown fields",
            details={"unknown_fields": unknown_fields},
            status_code=400,
        )

    values = [payload.get(column) for column in PAYLOAD_COLUMNS]

    query = """
            INSERT INTO consolidado(
                provincia, canton, parroquia, sector, fechareporte, horareporte, tipo,
                nombrerio, estado, fechadesbordamiento, antecedente, acciones,
                responsableregistro, observaciones, codigormnacional, codigormnacional2,
                novedadgeoglows, fechanovedadgeoglows, latitudlongitud, personasfallecidas,
                personasheridas, familiasafectadas, personasafectadas, familiasdamnificadas,
                personasdamnificadas, personasfallecidas2, personasheridas2,
                familiasafectadasev2, personasafectadasev2, familiasdamnificadasev2,
                personasdamnificadasev2, personasfallecidas3, personasheridas3,
                familiasafectadasev3, personasafectadasev3, familiasdamnificadasev3,
                personasdamnificadasev3, personasfallecidas4, personasheridas4,
                familiasafectadasev4, personasafectadasev4, familiasdamnificadasev4,
                personasdamnificadasev4, anio, desbordado, totalpersonasfallecidas,
                totalpersonasheridas, totalfamiliasafectadas, totalpersonasafectadas,
                totalfamiliasdamnificadas, totalpersonasdamnificadas, latitud, longitud,
                causa, evento, mesdesbordado, provinciagm, ubicacion2
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s
            );
            """

    connection = _get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, values)
            return cursor.lastrowid, PAYLOAD_COLUMNS
    except pymysql.MySQLError as db_error:
        raise ConsolidadoServiceError(
            "Database insert failed",
            details={
                "mysql_error": str(db_error),
                "query_preview_qmark": "INSERT INTO consolidado(provincia, canton, parroquia, sector, fechareporte, horareporte, tipo, nombrerio, estado, fechadesbordamiento, antecedente, acciones, responsableregistro, observaciones, codigormnacional, codigormnacional2, novedadgeoglows, fechanovedadgeoglows, latitudlongitud, personasfallecidas, personasheridas, familiasafectadas, personasafectadas, familiasdamnificadas, personasdamnificadas, personasfallecidas2, personasheridas2, familiasafectadasev2, personasafectadasev2, familiasdamnificadasev2, personasdamnificadasev2, personasfallecidas3, personasheridas3, familiasafectadasev3, personasafectadasev3, familiasdamnificadasev3, personasdamnificadasev3, personasfallecidas4, personasheridas4, familiasafectadasev4, personasafectadasev4, familiasdamnificadasev4, personasdamnificadasev4, anio, desbordado, totalpersonasfallecidas, totalpersonasheridas, totalfamiliasafectadas, totalpersonasafectadas, totalfamiliasdamnificadas, totalpersonasdamnificadas, latitud, longitud, causa, evento, mesdesbordado, provinciagm, ubicacion2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            },
            status_code=500,
        ) from db_error
    finally:
        connection.close()


def test_mysql_consolidado_connection():
    query = "SELECT DATABASE() AS database_name, USER() AS db_user, NOW() AS server_time"
    connection = _get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            row = cursor.fetchone() or {}
            return _to_json_safe(row)
    except pymysql.MySQLError as db_error:
        raise ConsolidadoServiceError(
            "MySQL connection test failed",
            details={"mysql_error": str(db_error)},
            status_code=500,
        ) from db_error
    finally:
        connection.close()


def get_consolidado():
    query = "SELECT * FROM consolidado ORDER BY id DESC LIMIT 100"
    connection = _get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall() or []
            return _to_json_safe(rows)
    except pymysql.MySQLError as db_error:
        raise ConsolidadoServiceError(
            "Database query failed",
            details={"mysql_error": str(db_error)},
            status_code=500,
        ) from db_error
    finally:
        connection.close()



