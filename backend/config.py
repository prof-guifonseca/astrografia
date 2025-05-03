# -*- coding: utf-8 -*-
import os
from dotenv import load_dotenv

# Carrega .env da raiz do projeto (onde .env.example está)
# Ajuste o path se o .env estiver em outro lugar
dotenv_path = os.path.join(os.path.dirname(__file__), ".env") 
load_dotenv(dotenv_path=dotenv_path)

class Config:
    """Configurações base."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "default-secret-key-change-me-in-prod") # Usado pelo Flask, não JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "default-jwt-secret-key-change-me")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # KEPHEMERIS_PATH será lido diretamente onde for necessário, não precisa estar aqui
    # Configurações de CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*") # Padrão permite tudo

class DevelopmentConfig(Config):
    """Configurações de desenvolvimento."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///astrografia_dev.db")
    # CORS pode ser mais permissivo em dev
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000") 

class TestingConfig(Config):
    """Configurações de teste."""
    TESTING = True
    # Usa um banco de dados em memória ou arquivo temporário para testes
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:") 
    JWT_SECRET_KEY = "test-jwt-secret" # Chave fixa para testes
    WTF_CSRF_ENABLED = False # Desabilita CSRF para testes de API
    # CORS geralmente não é um problema em testes unitários/integração
    CORS_ORIGINS = "*"

class ProductionConfig(Config):
    """Configurações de produção."""
    DEBUG = False
    TESTING = False
    # Exige DATABASE_URL em produção (não deve usar SQLite padrão)
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") 
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("No DATABASE_URL set for production environment")
    # Restringe CORS em produção
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS")
    if not CORS_ORIGINS or CORS_ORIGINS == "*":
        # Aviso ou erro se CORS não estiver restrito em produção
        print("WARNING: CORS_ORIGINS not set or is 
'*\'. Restrict origins in production!")
        # raise ValueError("CORS_ORIGINS must be set and restricted in production")

# Mapeamento para facilitar o carregamento baseado em FLASK_ENV
config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}

