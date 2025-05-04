# -*- coding: utf-8 -*-
import os
import logging
from datetime import timedelta, datetime, timezone
from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, jwt_required, get_jwt_identity,
    create_access_token, create_refresh_token
)
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# 🔧 Extensões globais
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
jwt = JWTManager()
logger = logging.getLogger(__name__)

# 🔐 Variáveis do ambiente (.env)
if os.environ.get("FLASK_ENV") != "production":
    from dotenv import load_dotenv
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(dotenv_path=dotenv_path)

# ♻️ Configurações
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
    CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL não definida para produção.")
    if Config.SECRET_KEY == "default-secret-key":
        raise RuntimeError("SECRET_KEY insegura para produção.")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

# 👤 Modelos
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)

    perspectives = db.relationship('Perspective', backref='author', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Perspective(db.Model):
    __tablename__ = 'perspectives'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    response_md = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

# 🔐 Autenticação
auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email e senha são obrigatórios."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado."}), 409

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    logger.info(f"Novo usuário registrado: {email}")
    return jsonify({"message": "Usuário registrado com sucesso."}), 201

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        identity = str(user.id)
        logger.info(f"Login realizado para: {email}")
        return jsonify(
            access_token=create_access_token(identity=identity),
            refresh_token=create_refresh_token(identity=identity)
        ), 200

    logger.warning(f"Tentativa de login inválida: {email}")
    return jsonify({"message": "Credenciais inválidas."}), 401

@auth_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    token = create_access_token(identity=identity)
    return jsonify(access_token=token), 200

# 🗣️ Perspectivas
perspectives_bp = Blueprint("perspectives_bp", __name__)

@perspectives_bp.route("/perspectives", methods=["POST"])
@jwt_required()
def create_perspective():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404

    text = request.json.get("text")
    if not text:
        return jsonify({"message": "Campo 'text' é obrigatório"}), 400

    perspective = Perspective(text=text, author=user, response_md="Interpretação automática (mock).")
    db.session.add(perspective)
    db.session.commit()
    logger.info(f"Perspectiva criada para User {user_id}")
    return jsonify({"message": "Criado com sucesso", "id": perspective.id}), 201

@perspectives_bp.route("/perspectives", methods=["GET"])
@jwt_required()
def list_perspectives():
    user_id = int(get_jwt_identity())
    result = Perspective.query.filter_by(user_id=user_id).all()
    return jsonify([
        {"id": p.id, "text": p.text, "response_md": p.response_md, "created_at": p.created_at.isoformat()}
        for p in result
    ])

# 📦 Registro modular de rotas
def register_routes(app):
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(perspectives_bp, url_prefix="/api")
