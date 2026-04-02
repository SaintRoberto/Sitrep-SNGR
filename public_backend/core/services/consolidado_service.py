from datetime import date, datetime, time
from decimal import Decimal

import psycopg2
from psycopg2.extras import RealDictCursor

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
    database_url = (current_app.config.get("DATABASE_URL") or "").strip()
    if database_url:
        return psycopg2.connect(database_url)

    host = (current_app.config.get("POSTGRES_HOST") or "").strip()
    port = int(current_app.config.get("POSTGRES_PORT") or 5432)
    dbname = (current_app.config.get("POSTGRES_DB") or "").strip()
    user = (current_app.config.get("POSTGRES_USER") or "").strip()
    password = (current_app.config.get("POSTGRES_PASS") or "").strip()
    sslmode = (current_app.config.get("POSTGRES_SSLMODE") or "").strip()

    missing = [
        key
        for key, value in {
            "POSTGRES_HOST": host,
            "POSTGRES_DB": dbname,
            "POSTGRES_USER": user,
            "POSTGRES_PASS": password,
        }.items()
        if not value
    ]

    if missing:
        raise ConsolidadoServiceError(
            "PostgreSQL configuration is incomplete",
            details={
                "config_error": "Missing PostgreSQL settings",
                "missing": missing,
                "accepted": [
                    "DATABASE_URL",
                    "POSTGRES_HOST",
                    "POSTGRES_PORT",
                    "POSTGRES_DB",
                    "POSTGRES_USER",
                    "POSTGRES_PASS",
                    "POSTGRES_SSLMODE",
                ],
            },
            status_code=500,
        )

    connect_kwargs = {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
    }
    if sslmode:
        connect_kwargs["sslmode"] = sslmode

    return psycopg2.connect(**connect_kwargs)


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
            INSERT INTO public.consolidado(
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
            )
            RETURNING id;
            """

    connection = _get_connection()
    try:
        with connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, values)
                inserted_row = cursor.fetchone() or {}
                return inserted_row.get("id"), PAYLOAD_COLUMNS
    except psycopg2.Error as db_error:
        raise ConsolidadoServiceError(
            "Database insert failed",
            details={
                "postgres_error": str(db_error),
                "query_preview_qmark": "INSERT INTO public.consolidado(provincia, canton, parroquia, sector, fechareporte, horareporte, tipo, nombrerio, estado, fechadesbordamiento, antecedente, acciones, responsableregistro, observaciones, codigormnacional, codigormnacional2, novedadgeoglows, fechanovedadgeoglows, latitudlongitud, personasfallecidas, personasheridas, familiasafectadas, personasafectadas, familiasdamnificadas, personasdamnificadas, personasfallecidas2, personasheridas2, familiasafectadasev2, personasafectadasev2, familiasdamnificadasev2, personasdamnificadasev2, personasfallecidas3, personasheridas3, familiasafectadasev3, personasafectadasev3, familiasdamnificadasev3, personasdamnificadasev3, personasfallecidas4, personasheridas4, familiasafectadasev4, personasafectadasev4, familiasdamnificadasev4, personasdamnificadasev4, anio, desbordado, totalpersonasfallecidas, totalpersonasheridas, totalfamiliasafectadas, totalpersonasafectadas, totalfamiliasdamnificadas, totalpersonasdamnificadas, latitud, longitud, causa, evento, mesdesbordado, provinciagm, ubicacion2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            },
            status_code=500,
        ) from db_error
    finally:
        connection.close()


def get_consolidado():
    query = "SELECT * FROM public.consolidado ORDER BY id DESC LIMIT 100"
    connection = _get_connection()
    try:
        with connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query)
                rows = cursor.fetchall() or []
                return _to_json_safe(rows)
    except psycopg2.Error as db_error:
        raise ConsolidadoServiceError(
            "Database query failed",
            details={"postgres_error": str(db_error)},
            status_code=500,
        ) from db_error
    finally:
        connection.close()
