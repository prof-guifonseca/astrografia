# -*- coding: utf-8 -*-
import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.models import db, User, Perspective

logger = logging.getLogger(__name__)
interpret_bp = Blueprint("interpret_bp", __name__)

def interpret_perspective_text(text: str, user: User) -> str:
    """
    Interpreta o texto da perspectiva usando lógica astrológica personalizada (mock).

    Args:
        text (str): Texto enviado pelo usuário.
        user (User): Usuário autor da perspectiva.

    Returns:
        str: Texto em Markdown com a análise.
    """
    logger.info("Interpretação (mock) acionada para User ID: %s", user.id)
    return (
        "### Interpretação para sua Perspectiva\n\n"
        f"_Texto Original:_\n> {text[:100]}...\n\n"
        "**Análise Astrológica (Em Desenvolvimento):**\n"
        "* Esta seção conterá a análise astrológica detalhada baseada no seu mapa natal e no texto fornecido.\n"
        "* Por enquanto, esta é uma resposta automática.\n"
    )

@interpret_bp.route("/perspective/<int:perspective_id>", methods=["GET"])
@jwt_required()
def get_interpretation_for_perspective(perspective_id):
    """
    Retorna a interpretação salva de uma perspectiva associada ao usuário autenticado.

    Parâmetros:
        perspective_id (int): ID da perspectiva.

    Retorno:
        JSON com o texto original e a interpretação Markdown.
    """
    try:
        user_id = int(get_jwt_identity())
    except ValueError:
        return jsonify({"message": "Identidade inválida no token"}), 422

    perspective = Perspective.query.filter_by(id=perspective_id, user_id=user_id).first()

    if not perspective:
        logger.warning("Perspectiva ID %s não encontrada para o usuário %s", perspective_id, user_id)
        return jsonify({"message": "Perspectiva não encontrada ou não pertence a este usuário."}), 404

    if perspective.response_md:
        logger.info("Interpretação encontrada para Perspectiva ID: %s", perspective_id)
        return jsonify({
            "perspective_id": perspective.id,
            "text": perspective.text,
            "interpretation_md": perspective.response_md
        }), 200
    else:
        logger.info("Interpretação ainda não disponível para Perspectiva ID: %s", perspective_id)
        return jsonify({"message": "Interpretação ainda não disponível para esta perspectiva."}), 404
