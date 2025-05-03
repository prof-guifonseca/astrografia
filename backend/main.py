# -*- coding: utf-8 -*-
import os
import sys
import logging
from datetime import timedelta
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

# dotenv só em dev/local
if os.environ.get("FLASK_ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Garante que 'src' está no path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# --- Importações locais ---
from src.models.models import db
from src.routes.auth import auth_bp
from src.routes.perspectives import perspectives_bp
from src.routes.astro import astro_bp

# --- Inicialização global do Bcrypt ---
bcrypt = Bcrypt()

def create_app():
    """Factory principal da aplicação Flask (Astrografia API)."""
    app = Flask(__name__)

    # Configurações básicas
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///astrografia.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "default-dev-secret-key-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    # Configuração de CORS
    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        CORS(app)  # aberto
    else:
        origins = [origin.strip() for origin in cors_origins.split(",")]
        CORS(app, resources={r"/*": {"origins": origins}})

    # Inicializações de extensão
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    # Registro das rotas (blueprints)
    app.register_blueprint(auth_bp)
    app.register_blueprint(perspectives_bp)
    app.register_blueprint(astro_bp)

    # Comando para criar as tabelas via CLI
    @app.cli.command("create-db")
    def create_db_command():
        """Cria as tabelas do banco de dados."""
        with app.app_context():
            print("Criando tabelas do banco...")
            db.create_all()
            print("Tabelas criadas com sucesso.")

    # Rota simples de saúde
    @app.route("/")
    def home():
        return "🌌 Astrografia API está online!"

    return app

# Execução direta (apenas para dev ou Dockerfile local)
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
