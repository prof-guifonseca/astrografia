# -*- coding: utf-8 -*-

import os
from datetime import timedelta, datetime, timezone
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# 🔧 Extensões globais
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
jwt = JWTManager()

# 📦 Importações locais atualizadas
from core import register_routes, User, Perspective
from astro_untils import astro_bp

# 🔐 Carrega variáveis do .env em desenvolvimento
if os.environ.get("FLASK_ENV") != "production":
    from dotenv import load_dotenv
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(dotenv_path=dotenv_path)

# ♻️ Configurações da aplicação
class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "default-secret-key")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "default-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///astrografia_dev.db")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    WTF_CSRF_ENABLED = False
    CORS_ORIGINS = "*"

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL não definida para produção.")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "")
    if not CORS_ORIGINS or CORS_ORIGINS.strip() == "*":
        print("⚠️ AVISO: CORS_ORIGINS não está restrito. Configure origens seguras para produção!")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

# 🚀 Factory principal
def create_app(config_name=None):
    config_name = config_name or os.getenv("FLASK_ENV", "default")
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        CORS(app)
    else:
        origins = [origin.strip() for origin in cors_origins.split(",")]
        CORS(app, resources={r"/api/*": {"origins": origins}})

    # 🧩 Registro dos Blueprints
    register_routes(app)
    app.register_blueprint(astro_bp, url_prefix="/api/astro")

    @app.cli.command("create-all-tables")
    def create_all_tables():
        with app.app_context():
            print("📦 Criando todas as tabelas do banco de dados...")
            db.create_all()
            print("✅ Tabelas criadas com sucesso.")

    @app.route("/")
    def home():
        return "🌌 Astrografia API está no ar!"

    return app

# ⏯️ Inicializa o app
app = create_app()
