from flask import Blueprint, jsonify, request

from ..services.afectaciones_service import (
    AfectacionesServiceError,
    get_eventos_no_por_lluvias,
    get_eventos_por_incendios,
    get_eventos_por_lluvias,
    get_eventos_por_tipo_lluvias,
    test_db_connection,
)
from ..utils.auth import require_api_key

public_bp = Blueprint("public", __name__, url_prefix="/api/public")


@public_bp.get("/health")
@require_api_key
def health():
    """Health publico
    ---
    tags:
      - Public
    parameters:
      - in: query
        name: api_key
        type: string
        required: true
        description: API key publica
    responses:
      200:
        description: Servicio activo
      401:
        description: Missing api_key
      403:
        description: Invalid api_key
    """
    return jsonify({"status": "ok", "service": "public-backend"}), 200


@public_bp.get("/test-conexion")
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
