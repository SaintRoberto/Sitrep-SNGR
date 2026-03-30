from collections import defaultdict, deque
from pathlib import Path
from threading import Lock
import time

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=_ENV_PATH)

from core.config import Config
from core.extensions import init_db
from core.routes.public import public_bp
from core.utils.auth import decode_token

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Public API",
        "description": "Documentacion de endpoints publicos con API key",
        "version": "1.0.0",
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Escribe: Bearer <tu_jwt_token>",
        }
    },
}

WHITELIST_PATHS = [
    "/api/public",
]

_rate_limit_store = defaultdict(deque)
_rate_limit_lock = Lock()


def _get_client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app.config)

    CORS(
        app,
        origins=app.config.get("FRONTEND_ORIGINS") or [app.config["FRONTEND_ORIGIN"]],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-API-Key"],
        supports_credentials=True,
    )

    app.register_blueprint(public_bp)
    register_error_handlers(app)
    register_public_rate_limit(app)
    register_auth_hook(app)

    Swagger(app, template=swagger_template)
    return app


def register_public_rate_limit(app: Flask) -> None:
    @app.before_request
    def limit_public_requests():
        if request.method == "OPTIONS":
            return None

        path = request.path
        if not path.startswith("/api/public"):
            return None

        if not app.config.get("PUBLIC_RATE_LIMIT_ENABLED", True):
            return None

        window_seconds = int(app.config.get("PUBLIC_RATE_LIMIT_WINDOW_SECONDS", 60))
        max_requests = int(app.config.get("PUBLIC_RATE_LIMIT_MAX_REQUESTS", 120))
        now = time.time()
        cutoff = now - window_seconds

        client_ip = _get_client_ip()

        with _rate_limit_lock:
            hits = _rate_limit_store[client_ip]
            while hits and hits[0] < cutoff:
                hits.popleft()

            if len(hits) >= max_requests:
                retry_after = int(max(1, window_seconds - (now - hits[0])))
                response = jsonify({
                    "error": "Too many requests",
                    "details": {
                        "message": f"Rate limit exceeded: {max_requests} requests per {window_seconds} seconds",
                        "retry_after_seconds": retry_after,
                    },
                })
                response.status_code = 429
                response.headers["Retry-After"] = str(retry_after)
                return response

            hits.append(now)

        return None


def register_auth_hook(app: Flask) -> None:
    @app.before_request
    def require_jwt_for_all():
        if request.method == "OPTIONS":
            return None

        path = request.path
        if (
            path in WHITELIST_PATHS
            or path.startswith("/api/public")
            or path.startswith("/apidocs")
            or path.startswith("/flasgger_static")
            or path.startswith("/apispec")
        ):
            return None

        auth = request.headers.get("Authorization")
        if not auth:
            return jsonify({"error": "Authorization header required"}), 401

        parts = auth.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Authorization header must be Bearer token"}), 401

        decoded = decode_token(parts[1])
        if not decoded:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.user = decoded


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_server_error(_error):
        return jsonify({"error": "Internal server error"}), 500


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

