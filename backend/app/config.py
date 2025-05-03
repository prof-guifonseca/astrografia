# -*- coding: utf-8 -*-
import os
from dotenv import load_dotenv

# Carrega variáveis de ambiente no desenvolvimento/local
if os.environ.get("FLASK_ENV") != "production":
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(dotenv_path=dotenv_path)

class Config:
    """Configurações base do Astrografia."""
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY não definida. Configure no ambiente.")

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "default-jwt-secret-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///astrografia_dev.db")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    JWT_SECRET_KEY = "test-jwt-secret"
    WTF_CSRF_ENABLED = False
    CORS_ORIGINS = "*"

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL não definida em produção.")

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS")
    if not CORS_ORIGINS or CORS_ORIGINS == "*":
        print("⚠️ AVISO: CORS_ORIGINS não está restrito. Configure origens seguras para produção!")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
