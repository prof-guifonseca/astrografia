# -*- coding: utf-8 -*-
import logging
from datetime import datetime, timezone
from flask import request, jsonify, Blueprint
from flask_jwt_extended import (
    jwt_required, get_jwt_identity,
    create_access_token, create_refresh_token
)

# 🔧 Importa extensões globais já iniciadas em main.py
from main import db, bcrypt

logger = logging.getLogger(__name__)

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
