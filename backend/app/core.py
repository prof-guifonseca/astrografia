# -*- coding: utf-8 -*-
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from app import db, bcrypt, User, Perspective

logger = logging.getLogger(__name__)

# ───────────────────────────────────────────────
# 🔐 AUTENTICAÇÃO
# ───────────────────────────────────────────────
auth_bp = Blueprint("auth_bp", __name__, url_prefix="/auth")

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
    except Exception:
        db.session.rollback()
        logger.exception("Erro ao registrar usuário")
        return jsonify({"message": "Erro interno ao registrar usuário."}), 500

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

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    token = create_access_token(identity=identity)
    logger.info("Token renovado para ID: %s", identity)
    return jsonify(access_token=token), 200

@auth_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "Usuário não encontrado."}), 404
        return jsonify(logged_in_as=user.email, user_id=user.id), 200
    except Exception:
        logger.exception("Erro na rota protegida")
        return jsonify({"message": "Erro ao verificar identidade."}), 422

# ───────────────────────────────────────────────
# 🧠 INTERPRETAÇÃO (Mock por enquanto)
# ───────────────────────────────────────────────
interpret_bp = Blueprint("interpret_bp", __name__, url_prefix="/interpret")

def interpret_perspective_text(text: str, user: User) -> str:
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
    try:
        user_id = int(get_jwt_identity())
        perspective = Perspective.query.filter_by(id=perspective_id, user_id=user_id).first()

        if not perspective:
            return jsonify({"message": "Perspectiva não encontrada ou não pertence ao usuário."}), 404

        if not perspective.response_md:
            return jsonify({"message": "Interpretação ainda não disponível."}), 404

        return jsonify({
            "perspective_id": perspective.id,
            "text": perspective.text,
            "interpretation_md": perspective.response_md
        }), 200

    except ValueError:
        return jsonify({"message": "Identidade inválida no token."}), 422
    except Exception:
        logger.exception("Erro ao recuperar interpretação.")
        return jsonify({"message": "Erro interno ao acessar interpretação."}), 500

# ───────────────────────────────────────────────
# 🗣️ CRIAÇÃO E LISTAGEM DE PERSPECTIVAS
# ───────────────────────────────────────────────
perspectives_bp = Blueprint("perspectives_bp", __name__, url_prefix="/perspectives")

@perspectives_bp.route("", methods=["GET", "POST"])
@jwt_required()
def handle_perspectives():
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

# ───────────────────────────────────────────────
# 🚀 Função para registrar tudo
# ───────────────────────────────────────────────
def register_routes(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(perspectives_bp, url_prefix="/api/perspectives")
    app.register_blueprint(interpret_bp, url_prefix="/api/interpret")
