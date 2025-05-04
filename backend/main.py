# -*- coding: utf-8 -*-
import os
import logging
from datetime import timedelta
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

# dotenv apenas em ambiente local
if os.environ.get("FLASK_ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# --- Importações locais (ajustadas à estrutura backend/app) ---
from app.config import Config
from app.models import db
from app.routes.auth import auth_bp
from app.routes.perspectives import perspectives_bp
from app.routes.astro import astro_bp

# --- Inicialização global ---
bcrypt = Bcrypt()

def create_app():
    """Factory principal da aplicação Flask (Astrografia API)."""
    app = Flask(__name__)
    
    # Configurações da aplicação
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///astrografia.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-key-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    # CORS
    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    CORS(app, resources={r"/*": {"origins": cors_origins.split(",")}} if cors_origins != "*" else {})

    # Inicializações
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    # Registro de blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(perspectives_bp)
    app.register_blueprint(astro_bp)

    # Comando para criar tabelas
    @app.cli.command("create-db")
    def create_db_command():
        with app.app_context():
            print("📦 Criando banco de dados...")
            db.create_all()
            print("✅ Banco criado com sucesso.")

    # Rota de saúde
    @app.route("/")
    def home():
        return "🌌 Astrografia API está online!"

    return app

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
