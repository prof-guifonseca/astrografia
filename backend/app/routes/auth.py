# -*- coding: utf-8 -*-
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from app import db, bcrypt, User  # ✅ Corrigido: import direto de app

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth_bp", __name__, url_prefix="/auth")

# 🔐 Registro de novo usuário
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email e senha são obrigatórios."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado."}), 409

    try:
        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        logger.info("Usuário registrado: %s", email)
        return jsonify({"message": "Usuário registrado com sucesso."}), 201
    except Exception as e:
        db.session.rollback()
        logger.exception("Erro ao registrar usuário")
        return jsonify({"message": "Erro interno ao registrar usuário."}), 500

# 🔑 Login do usuário
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email e senha são obrigatórios."}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        identity = str(user.id)
        access_token = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)
        logger.info("Login realizado: %s (ID %s)", email, identity)
        return jsonify(access_token=access_token, refresh_token=refresh_token), 200

    logger.warning("Tentativa de login inválida para: %s", email)
    return jsonify({"message": "Credenciais inválidas."}), 401

# 🔁 Renovação do token de acesso
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    token = create_access_token(identity=identity)
    logger.info("Token renovado para ID: %s", identity)
    return jsonify(access_token=token), 200

# 🔒 Rota protegida para testes ou debug
@auth_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "Usuário não encontrado."}), 404
        return jsonify(logged_in_as=user.email, user_id=user.id), 200
    except Exception as e:
        logger.exception("Erro na rota protegida")
        return jsonify({"message": "Erro ao verificar identidade."}), 422
