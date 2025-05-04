# -*- coding: utf-8 -*-
import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

from app.config import config_by_name
from app.models import db
from app.routes.auth import auth_bp
from app.routes.perspectives import perspectives_bp
from app.routes.astro import astro_bp

# Inicialização global
bcrypt = Bcrypt()

def create_app():
    """Factory principal da aplicação Flask (Astrografia API)."""
    env = os.environ.get("FLASK_ENV", "default")
    config_class = config_by_name.get(env)

    app = Flask(__name__)
    app.config.from_object(config_class)

    # CORS
    if app.config["CORS_ORIGINS"] == "*":
        CORS(app)
    else:
        origins = [origin.strip() for origin in app.config["CORS_ORIGINS"].split(",")]
        CORS(app, resources={r"/*": {"origins": origins}})

    # Inicializações
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(perspectives_bp)
    app.register_blueprint(astro_bp)

    # CLI para criar tabelas
    @app.cli.command("create-db")
    def create_db_command():
        with app.app_context():
            print("📦 Criando banco de dados...")
            db.create_all()
            print("✅ Banco criado com sucesso.")

    # Health check
    @app.route("/")
    def home():
        return "🌌 Astrografia API está online!"

    return app

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=(os.environ.get("FLASK_ENV") != "production"), host="0.0.0.0", port=port)
