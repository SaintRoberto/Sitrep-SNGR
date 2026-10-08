from datetime import datetime
from flask import Blueprint, current_app, jsonify, request

from ..services.afectaciones_service import (
    AfectacionesServiceError,
    get_eventos_no_por_lluvias,
    get_eventos_por_incendios,
    get_eventos_por_lluvias,
    get_eventos_por_tipo_lluvias,
    test_db_connection,
    get_asistencia_humanitaria_por_lluvias,
    get_eventos_por_lluvias_lluvias_total_por_dpa,
    get_eventos_por_lluvias_km_vias_por_categoria,
    get_alojamientos_temporales_abiertos_por_lluvias,
    get_alojamientos_temporales_cerrados_por_lluvias,
    get_asistencia_humanitaria_por_lluvias_SNDGIRD,
    get_personas_fallecidas_por_lluvias,
    get_eventos_lluvias_total_por_mes,
    get_cuerpos_hidricos_por_estado,
    get_niveles_alerta_por_lluvias,
    get_declaratorias_emergencia_por_lluvias,
    get_coes_por_lluvias,
    get_eventos_alto_impacto_por_lluvias,
)
from ..services.consolidado_service import (
    ConsolidadoServiceError,
    create_consolidado,
    get_consolidado,
    get_data_rios,
    test_mysql_consolidado_connection,
)
from ..utils.auth import require_api_key

public_bp = Blueprint("public", __name__, url_prefix="/api/public")




@public_bp.get("/test-conexion")
@require_api_key
def test_conexion():
    """Verifica conexion MySQL
    ---
    tags:
      - Public
    responses:
      200:
        description: Conexion MySQL exitosa
      500:
        description: Error de conexion o interno
    """
    try:
        data = test_db_connection()
        return jsonify({
            "status": "ok",
            "message": "Conexion MySQL exitosa",
            "db_check": data,
        }), 200
    except AfectacionesServiceError as error:
        return jsonify({
            "error": "Database connection failed",
            "details": error.details,
        }), 500
    except Exception as error:
        return jsonify({
            "error": "Internal server error",
            "details": str(error),
        }), 500



def _validate_body_api_key(api_key: str):
    api_key = (api_key or "").strip()
    if not api_key:
        return jsonify({"error": "Missing api_key"}), 401

    valid_keys = current_app.config.get("PUBLIC_API_KEYS", [])
    if api_key not in valid_keys:
        return jsonify({"error": "Invalid api_key"}), 403

    return None
def _parse_provincia_id_optional():
    provincia_raw = request.args.get("ProvinciaID")
    if provincia_raw is None or provincia_raw == "":
        return None, None, None

    try:
        return int(provincia_raw), None, None
    except ValueError:
        return None, jsonify({"error": "ProvinciaID must be an integer"}), 400


def _parse_sitrep_date_range():
    now = datetime.now()
    desde_raw = (request.args.get("desde") or "").strip()
    hasta_raw = (request.args.get("hasta") or "").strip()

    try:
        desde = datetime.fromisoformat(desde_raw) if desde_raw else datetime(now.year, 1, 1)
        hasta = datetime.fromisoformat(hasta_raw) if hasta_raw else now
    except ValueError:
        return None, None, jsonify({
            "error": "desde and hasta must use YYYY-MM-DD or ISO datetime format"
        }), 400

    if desde.tzinfo is not None or hasta.tzinfo is not None:
        return None, None, jsonify({
            "error": "desde and hasta must not include a timezone"
        }), 400

    if desde_raw and len(desde_raw) == 10:
        desde = desde.replace(hour=0, minute=0, second=0, microsecond=0)
    if hasta_raw and len(hasta_raw) == 10:
        hasta = hasta.replace(hour=23, minute=59, second=59, microsecond=999999)

    if desde > hasta:
        return None, None, jsonify({"error": "desde cannot be greater than hasta"}), 400

    return desde, hasta, None, None


@public_bp.get("/eventos-por-lluvias")
@require_api_key
def eventos_por_lluvias():
    """Lista eventos por lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Eventos
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_eventos_por_lluvias(desde, hasta, provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/eventos-no-por-lluvias")
@require_api_key
def eventos_no_por_lluvias():
    """Lista eventos no por lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Eventos
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_eventos_no_por_lluvias(provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/eventos-por-incendios-forestales")
@require_api_key
def eventos_por_incendios_forestales():
    """Lista eventos por incendios forestales, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Eventos
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_eventos_por_incendios(provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/eventos-por-tipo-lluvias")
@require_api_key
def eventos_por_tipo_lluvias():
    """Lista eventos por tipo lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Eventos
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_eventos_por_tipo_lluvias(desde, hasta, provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/asistencia-humanitaria-por-lluvias")
@require_api_key
def asistencia_humanitaria_por_lluvias():
    """Lista asistencia humanitaria por lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Asistencia Humanitaria
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_asistencia_humanitaria_por_lluvias(desde, hasta, provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/eventos-por-lluvias-total-por-dpa")
@require_api_key
def eventos_por_lluvias_total_por_dpa():
    """Lista total eventos por lluvias por DPA
    ---
    tags:
      - Eventos
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos por DPA
      500:
        description: Error en base de datos
    """
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_eventos_por_lluvias_lluvias_total_por_dpa(desde, hasta)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500

@public_bp.get("/asistencia-humanitaria-por-sngr-por-lluvias")
@require_api_key
def asistencia_humanitaria_por_sngr_por_lluvias():
    """Lista asistencia humanitaria por SNGR por lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Asistencia Humanitaria
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_asistencia_humanitaria_por_lluvias(desde, hasta, provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/eventos-por-lluvias-km-vias-por-categoria")
@require_api_key
def eventos_por_lluvias_km_vias_por_categoria():
  """Lista total eventos por lluvias por DPA km
  ---
  tags:
    - Eventos
  parameters:
    - in: query
      name: api_key
      type: string
      required: true
      description: Clave de API para autenticación
  responses:
    200:
      description: Lista de eventos por DPA
    500:
      description: Error en base de datos
  """
  desde, hasta, error_response, status_code = _parse_sitrep_date_range()
  if error_response is not None:
      return error_response, status_code

  try:
      data = get_eventos_por_lluvias_km_vias_por_categoria(desde, hasta)
      return jsonify({"total": len(data), "items": data}), 200
  except AfectacionesServiceError as error:
      return jsonify({"error": "Database query failed", "details": error.details}), 500

@public_bp.get("/alojamientos-temporales-abiertos-por-lluvias")
@require_api_key
def alojamientos_temporales_abiertos_por_lluvias():
    """Lista alojamientos temporales abiertos por lluvias
    ---
    tags:
      - Alojamiento Temporal
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de alojamientos temporales abiertos por lluvias
      500:
        description: Error en base de datos
    """
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_alojamientos_temporales_abiertos_por_lluvias(desde, hasta)
        return jsonify({"items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500

@public_bp.get("/alojamientos-temporales-cerrados-por-lluvias")
@require_api_key
def alojamientos_temporales_cerrados_por_lluvias():
    """Lista alojamientos temporales cerrados por lluvias
    ---
    tags:
      - Alojamiento Temporal
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de alojamientos temporales cerrados por lluvias
      500:
        description: Error en base de datos
    """
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_alojamientos_temporales_cerrados_por_lluvias(desde, hasta)
        return jsonify({"items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500

@public_bp.post("/consolidado/create")
@require_api_key
def crear_consolidado():
    """Inserta un registro en consolidado (MySQL)
    ---
    tags:
      - Consolidado
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave API publica
      - in: body
        name: body
        required: true
        schema:
          type: object
          additionalProperties: true
          description: Campos a insertar; las llaves deben coincidir con nombres de columnas en consolidado
    responses:
      201:
        description: Registro insertado correctamente
      400:
        description: Payload invalido
      500:
        description: Error interno o de base de datos
    """
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "JSON body is required"}), 400

    try:
        inserted_id, inserted_fields = create_consolidado(payload)
        return jsonify({
            "status": "ok",
            "message": "Registro insertado",
            "id": inserted_id,
        }), 201
    except ConsolidadoServiceError as error:
        return jsonify({
            "error": str(error),
            "details": error.details,
        }), error.status_code


@public_bp.get("/consolidado/get-consolidado")
@require_api_key
def obtener_consolidado():
    """Obtiene registros de consolidado (MySQL)
    ---
    tags:
      - Consolidado
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave API publica
    responses:
      200:
        description: Lista de registros en consolidado
      500:
        description: Error interno o de base de datos
    """
    try:
        data = get_consolidado()
        return jsonify({"items": data}), 200
    except ConsolidadoServiceError as error:
        return jsonify({
            "error": str(error),
            "details": error.details,
        }), error.status_code

@public_bp.get("/consolidado/test-conexion")
@require_api_key
def test_conexion_mysql_consolidado():
    """Verifica conexion MySQL para consolidado
    ---
    tags:
      - Consolidado
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave API publica
    responses:
      200:
        description: Conexion MySQL (consolidado) exitosa
      500:
        description: Error de conexion
    """
    try:
        data = test_mysql_consolidado_connection()
        return jsonify({
            "status": "ok",
            "message": "Conexion MySQL (consolidado) exitosa",
            "db_check": data,
        }), 200
    except ConsolidadoServiceError as error:
        return jsonify({
            "error": str(error),
            "details": error.details,
        }), error.status_code


#Rango de fechas en url query params: /consolidado/get_data_rios?fecha_inicio=2023-01-01&fecha_fin=2023-01-31
@public_bp.get("/consolidado/get_data_rios")
@require_api_key
def obtener_data_rios():
    """Obtiene datos de rios por rango de fechareporte
    ---
    tags:
      - Consolidado
    parameters:
      - in: query
        name: fecha_inicio
        type: string
        required: true
        description: Fecha inicio en formato YYYY-MM-DD
      - in: query
        name: fecha_fin
        type: string
        required: true
        description: Fecha fin en formato YYYY-MM-DD
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave API publica
    responses:
      200:
        description: Lista de registros filtrados por rango de fecha
      400:
        description: Parametros de fecha invalidos
      500:
        description: Error interno o de base de datos
    """
    fecha_inicio = (request.args.get("fecha_inicio") or "").strip()
    fecha_fin = (request.args.get("fecha_fin") or "").strip()

    if not fecha_inicio or not fecha_fin:
        return jsonify({"error": "fecha_inicio and fecha_fin are required"}), 400

    try:
        inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "fecha_inicio and fecha_fin must use YYYY-MM-DD format"}), 400

    if inicio_dt > fin_dt:
        return jsonify({"error": "fecha_inicio cannot be greater than fecha_fin"}), 400

    try:
        data = get_data_rios(fecha_inicio, fecha_fin)
        return jsonify({"total": len(data), "items": data}), 200
    except ConsolidadoServiceError as error:
        return jsonify({
            "error": str(error),
            "details": error.details,
        }), error.status_code


# Rango de fechas en JSON body: { "fecha_inicio": "2023-01-01", "fecha_fin": "2023-01-31" }
@public_bp.post("/consolidado/get_data_rios_daterange")
@require_api_key
def obtener_data_rios_body():
    """Obtiene datos de rios por rango de fechareporte usando JSON body
    ---
    tags:
      - Consolidado
    parameters:
      - in: header
        name: X-API-Key
        type: string
        required: true
        description: Clave API publica
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - fecha_inicio
            - fecha_fin
          properties:
            fecha_inicio:
              type: string
              description: Fecha inicio en formato YYYY-MM-DD
            fecha_fin:
              type: string
              description: Fecha fin en formato YYYY-MM-DD
    responses:
      200:
        description: Lista de registros filtrados por rango de fecha
      400:
        description: Parametros invalidos
      401:
        description: api_key faltante
      403:
        description: api_key invalida
      500:
        description: Error interno o de base de datos
    """
    payload = request.get_json(silent=True) or {}

    fecha_inicio = (payload.get("fecha_inicio") or "").strip()
    fecha_fin = (payload.get("fecha_fin") or "").strip()

    if not fecha_inicio or not fecha_fin:
        return jsonify({"error": "fecha_inicio and fecha_fin are required"}), 400

    try:
        inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "fecha_inicio and fecha_fin must use YYYY-MM-DD format"}), 400

    if inicio_dt > fin_dt:
        return jsonify({"error": "fecha_inicio cannot be greater than fecha_fin"}), 400

    try:
        data = get_data_rios(fecha_inicio, fecha_fin)
        return jsonify({"total": len(data), "items": data}), 200
    except ConsolidadoServiceError as error:
        return jsonify({
            "error": str(error),
            "details": error.details,
        }), error.status_code


@public_bp.get("/asistencia-humanitaria-por-sndgird-por-lluvias")
@require_api_key
def asistencia_humanitaria_por_sndgird_por_lluvias():
    """Lista asistencia humanitaria por SNDGIRD por lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Asistencia Humanitaria
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """  
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_asistencia_humanitaria_por_lluvias_SNDGIRD(desde, hasta, provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500



@public_bp.get("/personas-fallecidas-por-lluvias")
@require_api_key
def personas_fallecidas_por_lluvias():
    """Lista personas fallecidas por lluvias, opcionalmente filtrados por ProvinciaID
    ---
    tags:
      - Eventos 
    parameters:
      - in: query
        name: ProvinciaID
        type: integer
        required: false
        description: ID de provincia (ej. 1, 2, 3)
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de personas fallecidas por lluvias
      400:
        description: Parametro ProvinciaID invalido
      500:
        description: Error en base de datos
    """
    provincia_id, error_response, status_code = _parse_provincia_id_optional()
    if error_response is not None:
        return error_response, status_code
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_personas_fallecidas_por_lluvias(desde, hasta, provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500 
      
      
@public_bp.get("/eventos-lluvias-total-por-mes")
@require_api_key
def eventos_lluvias_total_por_mes():
    """Lista total eventos por lluvias por mes
    ---
    tags:
      - Eventos
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: Clave de API para autenticación
    responses:
      200:
        description: Lista de eventos por lluvias por mes
      500:
        description: Error en base de datos
    """
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_eventos_lluvias_total_por_mes(desde, hasta)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


def _cuerpos_hidricos_response(estado):
    try:
        data = get_cuerpos_hidricos_por_estado(estado)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/cuerpos-hidricos-desbordados-por-lluvias")
@require_api_key
def cuerpos_hidricos_desbordados_por_lluvias():
    """Lista cuerpos hidricos desbordados reportados para el SITREP de lluvias."""
    return _cuerpos_hidricos_response("Desbordado")


@public_bp.get("/cuerpos-hidricos-tendencia-a-aumentar-por-lluvias")
@require_api_key
def cuerpos_hidricos_tendencia_a_aumentar_por_lluvias():
    """Lista cuerpos hidricos con tendencia a aumentar de nivel."""
    return _cuerpos_hidricos_response("Con tendencia a aumentar de nivel")


@public_bp.get("/niveles-alerta-por-lluvias")
@require_api_key
def niveles_alerta_por_lluvias():
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_niveles_alerta_por_lluvias(desde, hasta)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/declaratorias-emergencia-por-lluvias")
@require_api_key
def declaratorias_emergencia_por_lluvias():
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_declaratorias_emergencia_por_lluvias(desde, hasta)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/coes-activados-por-lluvias")
@require_api_key
def coes_activados_por_lluvias():
    nivel = (request.args.get("tipo") or "").strip().upper()
    niveles_permitidos = {"COE-N", "COE-P", "COE-M", "COPAE"}
    if nivel not in niveles_permitidos:
        return jsonify({
            "error": "tipo must be one of COE-N, COE-P, COE-M or COPAE"
        }), 400

    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    try:
        data = get_coes_por_lluvias(desde, hasta, nivel)
        return jsonify({"tipo": nivel, "total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": str(error), "details": error.details}), 500


@public_bp.get("/eventos-alto-impacto-por-lluvias")
@require_api_key
def eventos_alto_impacto_por_lluvias():
    desde, hasta, error_response, status_code = _parse_sitrep_date_range()
    if error_response is not None:
        return error_response, status_code

    cantidad_raw = (request.args.get("cantidad") or "5").strip()
    try:
        cantidad = int(cantidad_raw)
    except ValueError:
        return jsonify({"error": "cantidad must be an integer"}), 400

    if cantidad < 1 or cantidad > 50:
        return jsonify({"error": "cantidad must be between 1 and 50"}), 400

    try:
        data = get_eventos_alto_impacto_por_lluvias(desde, hasta, cantidad)
        return jsonify({"cantidad": cantidad, "total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": str(error), "details": error.details}), 500
