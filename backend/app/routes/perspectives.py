# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.models import db, User, Perspective
from src.routes.interpret import interpret_perspective_text # Importar função (placeholder)
import traceback

perspectives_bp = Blueprint("perspectives_bp", __name__) # Prefixo definido no registro

@perspectives_bp.route("", methods=["GET", "POST"])
@jwt_required()
def handle_perspectives():
    current_user_identity = get_jwt_identity()
    try:
        current_user_id = int(current_user_identity)
    except ValueError:
        return jsonify({"msg": "Identidade inválida no token"}), 422

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "Usuário não encontrado para esta ação"}), 404

    if request.method == "POST":
        # Alterado para receber 'text'
        text = request.json.get("text", None)
        if not text:
            return jsonify({"msg": "Campo \'text\' é obrigatório para adicionar perspectiva."}), 400

        # Cria a perspectiva com o novo campo 'text'
        new_perspective = Perspective(text=text, author=user)
        
        # Chama a função de interpretação (placeholder)
        try:
            interpretation_md = interpret_perspective_text(text, user) # Passa o texto e o usuário
            new_perspective.response_md = interpretation_md # Salva a resposta
        except Exception as interp_e:
            # Loga o erro mas continua, salvando a perspectiva sem interpretação por enquanto
            print(f"Erro ao chamar interpretação para User ID {current_user_id}: {interp_e}")
            traceback.print_exc()
            new_perspective.response_md = "Erro ao gerar interpretação."

        try:
            db.session.add(new_perspective)
            db.session.commit()
            print(f"Perspectiva adicionada ao DB para User ID: {current_user_id}")
            return jsonify({
                "msg": "Perspectiva adicionada com sucesso.", 
                "perspective": {
                    "id": new_perspective.id,
                    "text": new_perspective.text,
                    "response_md": new_perspective.response_md, # Retorna a resposta
                    "created_at": new_perspective.created_at.isoformat()
                }
            }), 201
        except Exception as e:
            db.session.rollback()
            print(f"Erro ao adicionar perspectiva ao DB: {e}")
            traceback.print_exc()
            return jsonify({"msg": "Erro interno ao salvar perspectiva"}), 500

    elif request.method == "GET":
        # Implementação de paginação básica
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)
        
        # Garante que per_page não seja excessivo
        per_page = min(per_page, 50) 

        pagination = Perspective.query.filter_by(user_id=current_user_id)\
                                    .order_by(Perspective.created_at.desc())\
                                    .paginate(page=page, per_page=per_page, error_out=False)

        perspectives_list = [
            {
                "id": p.id, 
                "text": p.text, 
                "response_md": p.response_md,
                "created_at": p.created_at.isoformat()
            }
            for p in pagination.items
        ]
        print(f"Perspectivas recuperadas (página {page}) do DB para User ID: {current_user_id}")
        return jsonify({
            "perspectives": perspectives_list,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        })

