# -*- coding: utf-8 -*-
import os
from datetime import timedelta

# Carrega variáveis do .env somente em ambiente não produtivo
if os.environ.get("FLASK_ENV") != "production":
    from dotenv import load_dotenv
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(dotenv_path=dotenv_path)


class Config:
    """Configurações base para todos os ambientes."""
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("Faltando SECRET_KEY. Defina no .env ou nas variáveis do ambiente.")

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "default-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///astrografia_dev.db")
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-default-key")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    SECRET_KEY = "testing-secret-key"
    JWT_SECRET_KEY = "test-jwt-secret"
    WTF_CSRF_ENABLED = False
    CORS_ORIGINS = "*"


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL não definida em produção.")

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS")
    if not CORS_ORIGINS or CORS_ORIGINS == "*":
        print("⚠️ AVISO: CORS_ORIGINS não está restrito. Configure origens seguras para produção!")


# Mapeamento para seleção dinâmica da config no app
config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
