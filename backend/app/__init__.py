# -*- coding: utf-8 -*-
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import timedelta

from app.config import config_by_name

# Inicialização das extensões (sem app ainda)
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()

def create_app(config_name=None):
    """Application Factory"""
    config_name = config_name or os.getenv("FLASK_ENV", "default")
    
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Inicializar extensões
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)
    migrate.init_app(app, db)

    # CORS (com fallback seguro)
    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        CORS(app)
    else:
        CORS(app, resources={r"/api/*": {"origins": cors_origins.split(",")}})

    # Blueprints
    from app.routes.auth import auth_bp
    from app.routes.perspectives import perspectives_bp
    from app.routes.astro import astro_bp
    from app.routes.interpret import interpret_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(perspectives_bp, url_prefix="/api/perspectives")
    app.register_blueprint(astro_bp, url_prefix="/api/astro")
    app.register_blueprint(interpret_bp, url_prefix="/api/interpret")

    # Comando CLI opcional para criação total (útil em dev)
    @app.cli.command("create-all-tables")
    def create_all_tables():
        with app.app_context():
            print("Creating all database tables...")
            db.create_all()
            print("Done.")

    # Rota de teste
    @app.route("/")
    def home():
        return "Astrografia API está no ar!"

    return app
