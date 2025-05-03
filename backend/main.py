# -*- coding: utf-8 -*-
import os
import sys
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

# Adiciona o diretório pai (backend) ao sys.path para encontrar src
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.models import db
from src.routes.auth import auth_bp, bcrypt as auth_bcrypt # Importa bcrypt daqui
from src.routes.perspectives import perspectives_bp
from src.routes.astro import astro_bp

def create_app():
    """Application Factory Pattern"""
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")) # Carrega .env do diretório backend

    app = Flask(__name__)

    # --- Configurações --- 
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///astrografia.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "default-dev-secret-key-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    # --- Inicializações --- 
    db.init_app(app) # Vincula SQLAlchemy ao app
    jwt = JWTManager(app) # Vincula JWT ao app
    auth_bcrypt.init_app(app) # Vincula Bcrypt ao app (importado do auth blueprint)

    # --- Configuração de CORS --- 
    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    CORS(app, resources={r"/*": {"origins": cors_origins.split(",") if cors_origins != "*" else "*"}}) # Aplica CORS globalmente ou ajuste conforme necessário

    # --- Registro de Blueprints --- 
    app.register_blueprint(auth_bp)
    app.register_blueprint(perspectives_bp)
    app.register_blueprint(astro_bp)

    # --- CLI Command for DB Creation --- 
    @app.cli.command("create-db")
    def create_db_command():
        """Creates the database tables."""
        with app.app_context():
            print("Creating database tables...")
            db.create_all()
            print("Database tables created.")
            
    # --- Rota Raiz Simples --- 
    @app.route("/")
    def home():
        return "Astrografia API (Blueprints + DB) está no ar!"

    return app

# Import timedelta aqui para evitar erro de NameError na config
from datetime import timedelta

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    # O comando create-db deve ser executado separadamente via CLI: flask create-db
    app.run(debug=False, host="0.0.0.0", port=port)

