# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from src import bcrypt, db # Import bcrypt e db de src/__init__.py
from src.models.models import User # Importa User
import traceback

auth_bp = Blueprint("auth_bp", __name__) # Removido url_prefix daqui, será definido no registro

@auth_bp.route("/register", methods=["POST"])
def register():
    email = request.json.get("email", None) # Alterado para email
    password = request.json.get("password", None)
    if not email or not password:
        return jsonify({"msg": "Email e senha são obrigatórios"}), 400

    existing_user = User.query.filter_by(email=email).first() # Filtrar por email
    if existing_user:
        return jsonify({"msg": "Email já cadastrado"}), 409

    # Usa o bcrypt importado de src
    new_user = User(email=email) # Cria usuário com email
    new_user.set_password(password) # Define a senha usando o método do modelo (que usa bcrypt)

    try:
        db.session.add(new_user)
        db.session.commit()
        print(f"Usuário registrado no DB: {email}")
        return jsonify({"msg": "Usuário registrado com sucesso"}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao registrar usuário no DB: {e}")
        traceback.print_exc()
        return jsonify({"msg": "Erro interno ao registrar usuário"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    email = request.json.get("email", None) # Alterado para email
    password = request.json.get("password", None)
    if not email or not password:
        return jsonify({"msg": "Email e senha são obrigatórios"}), 400

    user = User.query.filter_by(email=email).first() # Filtrar por email

    # Usa o método check_password do modelo (que usa bcrypt)
    if user and user.check_password(password):
        identity_str = str(user.id) # Usa o ID do usuário como identidade no token
        access_token = create_access_token(identity=identity_str)
        refresh_token = create_refresh_token(identity=identity_str)
        print(f"Login bem-sucedido para ID: {user.id} ({email}), Identity: {identity_str}")
        return jsonify(access_token=access_token, refresh_token=refresh_token)
    else:
        print(f"Falha no login para: {email}")
        return jsonify({"msg": "Credenciais inválidas"}), 401

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity_str = get_jwt_identity()
    access_token = create_access_token(identity=identity_str)
    print(f"Token atualizado para Identity: {identity_str}")
    return jsonify(access_token=access_token)

# Rota protegida para teste (opcional, pode ser removida ou movida)
@auth_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user_identity = get_jwt_identity()
    try:
        current_user_id = int(current_user_identity)
    except ValueError:
        return jsonify({"msg": "Identidade inválida no token"}), 422

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "Usuário não encontrado"}), 404
    # Retorna o email
    return jsonify(logged_in_as=user.email, user_id=current_user_id), 200

