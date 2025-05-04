# -*- coding: utf-8 -*-
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from app.config import config_by_name

# Extensões globais
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name=None):
    """Factory principal da aplicação Flask (Astrografia API)."""
    config_name = config_name or os.getenv("FLASK_ENV", "default")
    
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Inicialização das extensões
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # Configuração de CORS
    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        CORS(app)
    else:
        origins = [origin.strip() for origin in cors_origins.split(",")]
        CORS(app, resources={r"/api/*": {"origins": origins}})

    # Registro de Blueprints
    from app.routes.auth import auth_bp
    from app.routes.perspectives import perspectives_bp
    from app.routes.astro import astro_bp
    from app.routes.interpret import interpret_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(perspectives_bp, url_prefix="/api/perspectives")
    app.register_blueprint(astro_bp, url_prefix="/api/astro")
    app.register_blueprint(interpret_bp, url_prefix="/api/interpret")

    # Comando CLI para desenvolvimento (criação de tabelas)
    @app.cli.command("create-all-tables")
    def create_all_tables():
        """Cria todas as tabelas com base nos modelos declarados."""
        with app.app_context():
            print("📦 Criando todas as tabelas do banco de dados...")
            db.create_all()
            print("✅ Tabelas criadas com sucesso.")

    # Rota de verificação
    @app.route("/")
    def home():
        return "🌌 Astrografia API está no ar!"

    return app
