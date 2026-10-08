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


def _filter_by_provincia(rows, provincia_id):
    if provincia_id is None:
        return rows
    return [row for row in rows if str(row.get("ProvinciaID")) == str(provincia_id)]


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


def get_eventos_por_lluvias(desde, hasta, provincia_id=None):
    query = "CALL dmeva.`spSitRepNac-Lluvias-Afec`(%s, %s)"
    params = [desde, hasta]

    try:
        rows = _filter_by_provincia(_run_query(query, params), provincia_id)
        return sorted(rows, key=lambda row: row.get("NumeroEventos") or 0, reverse=True)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "provincia_id": provincia_id,
        }
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


def get_eventos_por_tipo_lluvias(desde, hasta, provincia_id=None):
    query = "CALL dmeva.`spSitRepNac-Lluvias-TipoEvento`(%s, %s)"
    params = [desde, hasta]

    try:
        return _filter_by_provincia(_run_query(query, params), provincia_id)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "provincia_id": provincia_id,
        }
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_asistencia_humanitaria_por_lluvias(desde, hasta, provincia_id=None):
    query = "CALL dmeva.`spSitRepNac-Lluvias-AHS`(%s, %s)"
    params = [desde, hasta]

    try:
        return _filter_by_provincia(_run_query(query, params), provincia_id)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "provincia_id": provincia_id,
        }
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_por_lluvias_lluvias_total_por_dpa(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-TotalDPA`(%s, %s)"
    params = [desde, hasta]
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_alojamientos_temporales_abiertos_por_lluvias(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-ATA`(%s, %s)"
    params = [desde, hasta]
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_alojamientos_temporales_cerrados_por_lluvias(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-ATC`(%s, %s)"
    params = [desde, hasta]
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_por_lluvias_km_vias_por_categoria(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-KMViasCtg`(%s, %s)"
    params = [desde, hasta]
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error




def get_asistencia_humanitaria_por_lluvias_SNDGIRD(desde, hasta, provincia_id=None):
    query = "CALL dmeva.`spSitRepNac-Lluvias-AHT`(%s, %s)"
    params = [desde, hasta]

    try:
        return _filter_by_provincia(_run_query(query, params), provincia_id)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "provincia_id": provincia_id,
        }
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_personas_fallecidas_por_lluvias(desde, hasta, provincia_id=None):
    query = "CALL dmeva.`spSitRepNac-Lluvias-Fallecidos`(%s, %s)"
    params = [desde, hasta]

    try:
        return _filter_by_provincia(_run_query(query, params), provincia_id)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "provincia_id": provincia_id,
        }
        raise AfectacionesServiceError("Database query failed", details=details) from db_error
    
def get_eventos_lluvias_total_por_mes(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-Meses`(%s, %s)"
    params = [desde, hasta]
    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_cuerpos_hidricos_por_estado(estado):
    query = "CALL dmeva.`spSitRepNac-Lluvias-Cuerpos-Hidricos`(%s)"
    params = [estado]

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "estado": estado}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_niveles_alerta_por_lluvias(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-NivelAlerta`(%s, %s, %s)"
    params = [desde, hasta, "El Niño"]

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_declaratorias_emergencia_por_lluvias(desde, hasta):
    query = "CALL dmeva.`spSitRepNac-Lluvias-Emergencia`(%s, %s, %s)"
    params = [desde, hasta, "El Niño"]

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {"mysql_error": str(db_error), "desde": desde, "hasta": hasta}
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_coes_por_lluvias(desde, hasta, nivel):
    niveles_permitidos = {"COE-N", "COE-P", "COE-M", "COPAE"}
    if nivel not in niveles_permitidos:
        raise AfectacionesServiceError(
            "Invalid COE level",
            details={"nivel": nivel, "allowed": sorted(niveles_permitidos)},
        )

    query = "CALL dmeva.`spSitRepNac-Lluvias-COE`(%s, %s, %s, %s)"
    params = [desde, hasta, nivel, "El Niño,Época Lluviosa"]

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "nivel": nivel,
        }
        raise AfectacionesServiceError("Database query failed", details=details) from db_error


def get_eventos_alto_impacto_por_lluvias(desde, hasta, cantidad=5):
    query = "CALL dmeva.`spSitRepNac-Lluvias-Detalle`(%s, %s, %s)"
    params = [desde, hasta, cantidad]

    try:
        return _run_query(query, params)
    except pymysql.MySQLError as db_error:
        details = {
            "mysql_error": str(db_error),
            "desde": desde,
            "hasta": hasta,
            "cantidad": cantidad,
        }
        raise AfectacionesServiceError("Database query failed", details=details) from db_error
