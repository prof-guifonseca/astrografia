# -*- coding: utf-8 -*-
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.models import db, User, Perspective
import traceback

interpret_bp = Blueprint("interpret_bp", __name__) # Prefixo definido no registro

# --- Função de Interpretação (Placeholder) ---
# Esta função será chamada pela rota POST /perspectives
def interpret_perspective_text(text: str, user: User) -> str:
    """Placeholder para a lógica de interpretação astrológica do texto da perspectiva.
    
    Args:
        text (str): O texto da perspectiva enviado pelo usuário.
        user (User): O objeto User do autor da perspectiva (pode ser usado para 
                     acessar dados de nascimento no futuro).

    Returns:
        str: Uma string em Markdown com a interpretação (ou mensagem placeholder).
    """
    print(f"Chamando interpretação (placeholder) para User ID: {user.id}")
    # TODO: Implementar a lógica real de interpretação aqui.
    # Exemplo: Cruzar o texto com o mapa natal do usuário (que precisaria ser armazenado ou calculado).
    interpretation_md = f"### Interpretação para sua Perspectiva\n\n_Texto Original:_\n> {text[:100]}...\n\n**Análise Astrológica (Em Desenvolvimento):**\n*   Esta seção conterá a análise astrológica detalhada baseada no seu mapa natal e no texto fornecido.\n*   Por enquanto, esta é uma resposta automática.\n"
    return interpretation_md

# --- Endpoint GET (Opcional, pode ser removido se não for usado diretamente) ---
@interpret_bp.route("/perspective/<int:perspective_id>", methods=["GET"])
@jwt_required()
def get_interpretation_for_perspective(perspective_id):
    """Endpoint para obter a interpretação já salva para uma perspectiva específica."""
    current_user_identity = get_jwt_identity()
    try:
        current_user_id = int(current_user_identity)
    except ValueError:
        return jsonify({"msg": "Identidade inválida no token"}), 422

    perspective = Perspective.query.filter_by(id=perspective_id, user_id=current_user_id).first()

    if not perspective:
        return jsonify({"msg": "Perspectiva não encontrada ou não pertence a este usuário."}), 404

    # Retorna a interpretação que já foi gerada e salva no campo response_md
    if perspective.response_md:
        print(f"Retornando interpretação salva para Perspectiva ID: {perspective_id}")
        return jsonify({
            "perspective_id": perspective.id,
            "text": perspective.text, # Retorna o texto original
            "interpretation_md": perspective.response_md # Retorna a interpretação salva
        }), 200
    else:
        # Se por algum motivo não houver interpretação salva (ex: erro anterior)
        print(f"Interpretação não encontrada para Perspectiva ID: {perspective_id}")
        return jsonify({"msg": "Interpretação ainda não disponível para esta perspectiva."}), 404

