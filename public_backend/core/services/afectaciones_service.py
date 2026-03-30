import pymysql

from ..extensions import get_db_connection


class AfectacionesServiceError(Exception):
    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details or {}


def _run_query(query, params=None):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params or [])
            return cursor.fetchall()
    finally:
        connection.close()


def test_db_connection():
    try:
        rows = _run_query("SELECT 1 AS ok")
        return rows[0] if rows else {"ok": 1}
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error)}
        raise AfectacionesServiceError("Database connection failed", details=details) from db_error
    except Exception as error:
        details = {"error": str(error)}
        raise AfectacionesServiceError("Unexpected service error", details=details) from error


def get_eventos_por_lluvias(provincia_id=None):
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-EventosPorLluvias 2026+`"
    params = []
    if provincia_id is not None:
        query += " WHERE ProvinciaID = %s"
        params.append(provincia_id)
    query += " ORDER BY NumeroEventos DESC"

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "provincia_id": provincia_id}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_no_por_lluvias(provincia_id=None):
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-EventosNoPorLluvias 2026+`"
    params = []
    if provincia_id is not None:
        query += " WHERE ProvinciaID = %s"
        params.append(provincia_id)

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "provincia_id": provincia_id}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_por_incendios(provincia_id=None):
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-EventosPorIncendiosForestales 2026+`"
    params = []
    if provincia_id is not None:
        query += " WHERE ProvinciaID = %s"
        params.append(provincia_id)

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "provincia_id": provincia_id}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_por_tipo_lluvias(provincia_id=None):
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-EventosPorTipoPorLluvias 2026+`"
    params = []
    if provincia_id is not None:
        query += " WHERE ProvinciaID = %s"
        params.append(provincia_id)

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "provincia_id": provincia_id}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_asistencia_humanitaria_por_lluvias(provincia_id=None):
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-AsistenciaHumanitariaSNDGIRDPorLluvias 2026+`"
    params = []
    if provincia_id is not None:
        query += " WHERE ProvinciaID = %s"
        params.append(provincia_id)

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "provincia_id": provincia_id}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_por_lluvias_lluvias_total_por_dpa():
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-EventosPorLluviasTotalPorDPA 2026+`"
    params = []
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error)}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_por_lluvias_km_vias_por_categoria():
    query = "SELECT * FROM dmeva.`RED-M-2026-Sitrep-EventosPorLluviasKmViasPorCategoria 2026+`"
    params = []
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error)}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error
