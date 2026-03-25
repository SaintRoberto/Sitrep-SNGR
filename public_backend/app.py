from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv

from core.config import Config
from core.extensions import init_db
from core.routes.public import public_bp
from core.utils.auth import decode_token

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Public API",
        "description": "Documentacion de endpoints con JWT",
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
    "security": [{"Bearer": []}],
}

WHITELIST_PATHS = [
    "/api/health",
    "/api/public",
]


def create_app() -> Flask:
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app.config)

    CORS(
        app,
        origins=app.config.get("FRONTEND_ORIGINS") or [app.config["FRONTEND_ORIGIN"]],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True,
    )

    app.register_blueprint(public_bp)
    register_error_handlers(app)
    register_auth_hook(app)

    Swagger(app, template=swagger_template)

    @app.get("/api/health")
    def health_check():
        """Health check
        ---
        tags:
          - Health
        responses:
          200:
            description: API funcionando correctamente
        """
        return jsonify({"estado": "OK", "mensaje": "API funcionando correctamente"})

    return app


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

