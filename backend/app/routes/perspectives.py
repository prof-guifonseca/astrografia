# -*- coding: utf-8 -*-
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.models import db, User, Perspective
from app.routes.interpret import interpret_perspective_text

logger = logging.getLogger(__name__)
perspectives_bp = Blueprint("perspectives_bp", __name__, url_prefix="/perspectives")

@perspectives_bp.route("", methods=["GET", "POST"])
@jwt_required()
def handle_perspectives():
    """
    Manipula Perspectivas:
    - POST: Cria uma nova perspectiva e gera uma interpretação mock.
    - GET: Retorna lista paginada de perspectivas do usuário autenticado.
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "Usuário não encontrado"}), 404
    except ValueError:
        return jsonify({"message": "Identidade inválida no token"}), 422
    except Exception:
        logger.exception("Erro ao recuperar identidade do usuário.")
        return jsonify({"message": "Erro interno na autenticação"}), 500

    if request.method == "POST":
        text = request.json.get("text")
        if not text:
            return jsonify({"message": "Campo 'text' é obrigatório"}), 400

        new_perspective = Perspective(text=text, author=user)

        try:
            new_perspective.response_md = interpret_perspective_text(text, user)
        except Exception:
            logger.exception("Erro ao gerar interpretação para a perspectiva.")
            new_perspective.response_md = "Erro ao gerar interpretação."

        try:
            db.session.add(new_perspective)
            db.session.commit()
            logger.info("Perspectiva adicionada para User ID: %s", user_id)
            return jsonify({
                "message": "Perspectiva criada com sucesso.",
                "perspective": {
                    "id": new_perspective.id,
                    "text": new_perspective.text,
                    "response_md": new_perspective.response_md,
                    "created_at": new_perspective.created_at.isoformat()
                }
            }), 201
        except Exception:
            db.session.rollback()
            logger.exception("Erro ao salvar perspectiva no banco.")
            return jsonify({"message": "Erro ao salvar perspectiva"}), 500

    elif request.method == "GET":
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 10, type=int), 50)

        try:
            pagination = Perspective.query.filter_by(user_id=user_id)\
                .order_by(Perspective.created_at.desc())\
                .paginate(page=page, per_page=per_page, error_out=False)

            perspectives_list = [
                {
                    "id": p.id,
                    "text": p.text,
                    "response_md": p.response_md,
                    "created_at": p.created_at.isoformat()
                } for p in pagination.items
            ]

            logger.info("Perspectivas listadas (página %s) para User ID: %s", page, user_id)
            return jsonify({
                "perspectives": perspectives_list,
                "total": pagination.total,
                "pages": pagination.pages,
                "current_page": page,
                "per_page": per_page,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev
            }), 200

        except Exception:
            logger.exception("Erro ao listar perspectivas.")
            return jsonify({"message": "Erro ao recuperar perspectivas"}), 500
