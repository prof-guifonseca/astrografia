# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.models import db, User, Perspective # Importa do novo local
import traceback

perspectives_bp = Blueprint("perspectives_bp", __name__, url_prefix="/api/perspectives")

@perspectives_bp.route("", methods=["GET", "POST"])
@jwt_required()
def handle_perspectives():
    current_user_identity = get_jwt_identity() # String ID
    try:
        current_user_id = int(current_user_identity) # Converte para int para query
    except ValueError:
        return jsonify({"msg": "Identidade inválida no token"}), 422

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "Usuário não encontrado para esta ação"}), 404

    if request.method == "POST":
        title = request.json.get("title", None)
        content = request.json.get("content", None)
        if not title or not content:
            return jsonify({"msg": "Campos 'title' e 'content' são obrigatórios para adicionar perspectiva."}), 400

        # Cria a perspectiva usando os campos corretos do modelo
        new_perspective = Perspective(title=title, content=content, author=user)
        try:
            db.session.add(new_perspective)
            db.session.commit()
            print(f"Perspectiva adicionada ao DB para User ID: {current_user_id}")
            # TODO: Acionar /interpretSection aqui no futuro
            return jsonify({
                "msg": "Perspectiva adicionada com sucesso.", 
                "perspective": {
                    "id": new_perspective.id,
                    "title": new_perspective.title,
                    "content": new_perspective.content,
                    "created_at": new_perspective.created_at.isoformat() # Usa o campo correto
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            print(f"Erro ao adicionar perspectiva ao DB: {e}")
            traceback.print_exc()
            return jsonify({"msg": "Erro interno ao salvar perspectiva"}), 500

    elif request.method == "GET":
        # Ordena por created_at descendente
        user_perspectives = Perspective.query.filter_by(user_id=current_user_id).order_by(Perspective.created_at.desc()).all()
        perspectives_list = [
            {
                "id": p.id, 
                "title": p.title, 
                "content": p.content, 
                "created_at": p.created_at.isoformat() # Usa o campo correto
            }
            for p in user_perspectives
        ]
        print(f"Perspectivas recuperadas do DB para User ID: {current_user_id}")
        return jsonify(perspectives=perspectives_list)

