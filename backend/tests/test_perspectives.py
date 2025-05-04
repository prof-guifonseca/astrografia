# -*- coding: utf-8 -*-
import pytest
from backend.models import Perspective, db, User  # Import ajustado para nova estrutura

# Usa as fixtures definidas em conftest.py (client, app, auth_tokens, headers)

# --- Testes de Criação de Perspectivas (POST) --- 

def test_create_perspective_success(client, headers):
    """Testa a criação bem-sucedida de uma nova perspectiva."""
    payload = {"title": "Minha Primeira Perspectiva", "content": "Este é o conteúdo."}
    response = client.post("/api/perspectives", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json["msg"] == "Perspectiva adicionada com sucesso."
    assert "perspective" in response.json
    assert response.json["perspective"]["title"] == payload["title"]
    assert response.json["perspective"]["content"] == payload["content"]
    assert "id" in response.json["perspective"]
    assert "created_at" in response.json["perspective"]

def test_create_perspective_missing_fields(client, headers):
    """Testa a criação de perspectiva sem title ou content."""
    response_no_title = client.post("/api/perspectives", json={"content": "Conteúdo"}, headers=headers)
    assert response_no_title.status_code == 400
    assert "Campos 'title' e 'content' são obrigatórios" in response_no_title.json["msg"]

    response_no_content = client.post("/api/perspectives", json={"title": "Título"}, headers=headers)
    assert response_no_content.status_code == 400
    assert "Campos 'title' e 'content' são obrigatórios" in response_no_content.json["msg"]

def test_create_perspective_no_auth(client):
    """Testa a criação de perspectiva sem autenticação."""
    payload = {"title": "Título", "content": "Conteúdo"}
    response = client.post("/api/perspectives", json=payload)
    assert response.status_code == 401
    assert response.json["msg"] == "Missing Authorization Header"

# --- Testes de Leitura de Perspectivas (GET) --- 

def test_get_perspectives_success(client, headers, app):
    """Testa a leitura de perspectivas para o usuário autenticado."""
    with app.app_context():
        user_id = 1
        Perspective.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        p1 = Perspective(title="P1", content="C1", user_id=user_id)
        p2 = Perspective(title="P2", content="C2", user_id=user_id)
        db.session.add_all([p1, p2])
        db.session.commit()

    response = client.get("/api/perspectives", headers=headers)
    assert response.status_code == 200
    assert "perspectives" in response.json
    assert isinstance(response.json["perspectives"], list)
    titles = [p["title"] for p in response.json["perspectives"]]
    assert "P1" in titles
    assert "P2" in titles

def test_get_perspectives_no_auth(client):
    """Testa a leitura de perspectivas sem autenticação."""
    response = client.get("/api/perspectives")
    assert response.status_code == 401
    assert response.json["msg"] == "Missing Authorization Header"

def test_get_perspectives_no_perspectives(client, headers, app):
    """Testa a leitura quando o usuário não tem perspectivas."""
    with app.app_context():
        user_id = 1
        Perspective.query.filter_by(user_id=user_id).delete()
        db.session.commit()

    response = client.get("/api/perspectives", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json["perspectives"], list)
    assert len(response.json["perspectives"]) == 0

# --- Testes do Endpoint de Interpretação (Placeholder) --- 

def test_interpret_perspective_success(client, headers, app):
    """Testa o endpoint de interpretação com sucesso."""
    with app.app_context():
        user_id = 1
        p = Perspective(title="Para Interpretar", content="Conteúdo", user_id=user_id)
        db.session.add(p)
        db.session.commit()
        perspective_id = p.id

    response = client.get(f"/api/interpret/perspective/{perspective_id}", headers=headers)
    assert response.status_code == 200
    assert "interpretation" in response.json
    assert "ainda está em desenvolvimento" in response.json["interpretation"]
    assert response.json["perspective_id"] == perspective_id
    assert response.json["perspective_title"] == "Para Interpretar"

def test_interpret_perspective_not_found(client, headers):
    """Testa interpretar uma perspectiva inexistente."""
    response = client.get("/api/interpret/perspective/9999", headers=headers)
    assert response.status_code == 404
    assert "Perspectiva não encontrada" in response.json["msg"]

def test_interpret_perspective_not_owner(client, headers, app):
    """Testa interpretar uma perspectiva de outro usuário."""
    with app.app_context():
        other_user = User(username="otheruser_interpret", password_hash="hash")
        db.session.add(other_user)
        db.session.commit()
        op = Perspective(title="Outra Perspectiva", content="C", user_id=other_user.id)
        db.session.add(op)
        db.session.commit()
        other_perspective_id = op.id

    response = client.get(f"/api/interpret/perspective/{other_perspective_id}", headers=headers)
    assert response.status_code == 404
    assert "Perspectiva não encontrada" in response.json["msg"]

def test_interpret_perspective_no_auth(client, app):
    """Testa interpretar sem autenticação."""
    with app.app_context():
        p = Perspective(title="Teste No Auth", content="C", user_id=1)
        db.session.add(p)
        db.session.commit()
        perspective_id = p.id

    response = client.get(f"/api/interpret/perspective/{perspective_id}")
    assert response.status_code == 401
    assert response.json["msg"] == "Missing Authorization Header"
