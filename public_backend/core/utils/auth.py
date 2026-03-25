from functools import wraps

import jwt
from flask import current_app, jsonify, request


def require_api_key(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        api_key = request.args.get("api_key")

        if not api_key:
            return jsonify({"error": "Missing api_key"}), 401

        valid_keys = current_app.config.get("PUBLIC_API_KEYS", [])
        if api_key not in valid_keys:
            return jsonify({"error": "Invalid api_key"}), 403

        return view_func(*args, **kwargs)

    return wrapper


def decode_token(token: str):
    secret = current_app.config.get("JWT_SECRET", "")
    algorithm = current_app.config.get("JWT_ALGORITHM", "HS256")

    if not secret:
        return None

    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except jwt.PyJWTError:
        return None
