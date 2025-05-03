# -*- coding: utf-8 -*-
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate # Importar Flask-Migrate
from datetime import timedelta

# Importar configurações
from .config import config_by_name

# Inicializar extensões (sem app ainda)
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate() # Inicializar Migrate

def create_app(config_name=None):
    """Application Factory Pattern"""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "default")

    app = Flask(__name__)
    # Define o path raiz do projeto para facilitar imports relativos
    app.instance_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app.config.from_object(config_by_name[config_name])

    # --- Inicializar extensões com o app ---
    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app) # JWT pode ser inicializado aqui
    migrate.init_app(app, db) # Inicializar Migrate com app e db

    # --- Configuração de CORS --- 
    # Usar a configuração do objeto config
    CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*").split(",") if app.config.get("CORS_ORIGINS", "*") != "*" else "*"}})

    # --- Registrar Blueprints --- 
    # Importar blueprints aqui para evitar importação circular
    from .routes.auth import auth_bp
    from .routes.perspectives import perspectives_bp
    from .routes.astro import astro_bp
    from .routes.interpret import interpret_bp
    # Adicionar outros blueprints se existirem (ex: feedback)
    # from .routes.feedback import feedback_bp 

    # Corrigido: Remover barras invertidas e aspas extras
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(perspectives_bp, url_prefix="/api/perspectives")
    app.register_blueprint(astro_bp, url_prefix="/api/astro")
    app.register_blueprint(interpret_bp, url_prefix="/api/interpret")
    # app.register_blueprint(feedback_bp, url_prefix="/api/feedback")

    # --- Comandos CLI --- 
    # O comando create-db pode ser removido se usarmos Flask-Migrate
    # Flask-Migrate fornece `flask db init`, `flask db migrate`, `flask db upgrade`
    # Se ainda quiser um comando simples para criar tudo:
    @app.cli.command("create-all-tables")
    def create_all_tables_command():
        """Creates all database tables (use migrations for changes)."""
        with app.app_context():
            print("Creating all database tables based on models...")
            db.create_all()
            print("All database tables created.")
            
    # --- Rota Raiz Simples --- 
    @app.route("/")
    def home():
        return "Astrografia API está no ar!"

    return app

