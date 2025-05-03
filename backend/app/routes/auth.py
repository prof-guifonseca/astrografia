# -*- coding: utf-8 -*-
import logging
import traceback
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from app import bcrypt, db
from app.models.models import User

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    email = request.json.get("email")
    password = request.json.get("password")

    if not email or not password:
        return jsonify({"message": "Email e senha são obrigatórios"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado"}), 409

    try:
        new_user = User(email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        logger.info("Usuário registrado com sucesso: %s", email)
        return jsonify({"message": "Usuário registrado com sucesso"}), 201
    except Exception as e:
        db.session.rollback()
        logger.error("Erro ao registrar usuário: %s", e, exc_info=True)
        return jsonify({"message": "Erro interno ao registrar usuário"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    email = request.json.get("email")
    password = request.json.get("password")

    if not email or not password:
        return jsonify({"message": "Email e senha são obrigatórios"}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        identity = str(user.id)
        access_token = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)
        logger.info("Login bem-sucedido: %s (ID %s)", email, identity)
        return jsonify(access_token=access_token, refresh_token=refresh_token), 200
    else:
        logger.warning("Falha de login para: %s", email)
        return jsonify({"message": "Credenciais inválidas"}), 401

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    logger.info("Token renovado para ID: %s", identity)
    return jsonify(access_token=access_token)

@auth_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "Usuário não encontrado"}), 404
        return jsonify(logged_in_as=user.email, user_id=user_id), 200
    except ValueError:
        return jsonify({"message": "Identidade inválida no token"}), 422
