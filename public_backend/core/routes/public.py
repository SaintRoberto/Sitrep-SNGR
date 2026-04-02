from flask import Blueprint, jsonify, request

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
)
from ..services.consolidado_service import (
    ConsolidadoServiceError,
    create_consolidado,
    get_consolidado,
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


def _parse_provincia_id_optional():
    provincia_raw = request.args.get("ProvinciaID")
    if provincia_raw is None or provincia_raw == "":
        return None, None, None

    try:
        return int(provincia_raw), None, None
    except ValueError:
        return None, jsonify({"error": "ProvinciaID must be an integer"}), 400


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

    try:
        data = get_eventos_por_lluvias(provincia_id)
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

    try:
        data = get_eventos_por_tipo_lluvias(provincia_id)
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

    try:
        data = get_asistencia_humanitaria_por_lluvias(provincia_id)
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
    try:
        data = get_eventos_por_lluvias_lluvias_total_por_dpa()
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500

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

    try:
        data = get_asistencia_humanitaria_por_lluvias(provincia_id)
        return jsonify({"total": len(data), "items": data}), 200
    except AfectacionesServiceError as error:
        return jsonify({"error": "Database query failed", "details": error.details}), 500


@public_bp.get("/eventos-por-lluvias-km-vias-por-categoria")
@require_api_key
def eventos_por_lluvias_km_vias_por_categoria():
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
  try:
      data = get_eventos_por_lluvias_km_vias_por_categoria()
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
    try:
        data = get_alojamientos_temporales_abiertos_por_lluvias()
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
    try:
        data = get_alojamientos_temporales_cerrados_por_lluvias()
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

