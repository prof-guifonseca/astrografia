# -*- coding: utf-8 -*-
import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.models import db, User, Perspective

logger = logging.getLogger(__name__)
interpret_bp = Blueprint("interpret_bp", __name__, url_prefix="/interpret")

def interpret_perspective_text(text: str, user: User) -> str:
    """
    Função placeholder para gerar análise astrológica com base no texto da perspectiva.
    
    Args:
        text (str): Texto escrito pelo usuário.
        user (User): Instância do usuário (poderá conter mapa natal futuramente).

    Returns:
        str: Texto de retorno em Markdown.
    """
    logger.info("Mock de interpretação acionado para User ID: %s", user.id)
    return (
        "### Interpretação para sua Perspectiva\n\n"
        f"_Texto Original:_\n> {text[:100]}...\n\n"
        "**Análise Astrológica (Em Desenvolvimento):**\n"
        "* Esta seção conterá a análise astrológica detalhada baseada no seu mapa natal.\n"
        "* Por enquanto, esta é uma resposta automática.\n"
    )

@interpret_bp.route("/perspective/<int:perspective_id>", methods=["GET"])
@jwt_required()
def get_interpretation_for_perspective(perspective_id):
    """
    Retorna a análise salva de uma perspectiva registrada por um usuário autenticado.
    
    Args:
        perspective_id (int): ID da perspectiva desejada.

    Returns:
        JSON com texto e resposta interpretativa (se houver).
    """
    try:
        user_id = int(get_jwt_identity())
        perspective = Perspective.query.filter_by(id=perspective_id, user_id=user_id).first()

        if not perspective:
            logger.warning("Perspectiva ID %s não encontrada para usuário ID %s", perspective_id, user_id)
            return jsonify({"message": "Perspectiva não encontrada ou não pertence ao usuário."}), 404

        if not perspective.response_md:
            logger.info("Interpretação pendente para Perspectiva ID: %s", perspective_id)
            return jsonify({"message": "Interpretação ainda não disponível."}), 404

        logger.info("Interpretação retornada para Perspectiva ID: %s", perspective_id)
        return jsonify({
            "perspective_id": perspective.id,
            "text": perspective.text,
            "interpretation_md": perspective.response_md
        }), 200

    except ValueError:
        logger.error("Token JWT inválido — não foi possível converter identidade para int.")
        return jsonify({"message": "Identidade inválida no token."}), 422

    except Exception as e:
        logger.exception("Erro ao recuperar interpretação.")
        return jsonify({"message": "Erro interno ao acessar interpretação."}), 500
