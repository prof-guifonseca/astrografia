# -*- coding: utf-8 -*-
import pytest
from flask import jsonify
from src.models.models import User, db

# Usa as fixtures definidas em conftest.py (client, app, auth_tokens, headers)

# Define um usuário diferente para testes de registro duplicado
OTHER_USER = {
    "username": "otheruser",
    "password": "otherpass"
}

# --- Testes de Registro --- 

def test_register_success(client): # Não precisa de app aqui, client já usa
    """Testa o registro bem-sucedido de um novo usuário."""
    response = client.post("/api/auth/register", json=OTHER_USER)
    assert response.status_code == 201
    assert response.json["msg"] == "Usuário registrado com sucesso"
    # Verifica se o usuário foi realmente criado no DB (opcional, mas bom)
    # Precisa do contexto do app para query
    # user = User.query.filter_by(username=OTHER_USER["username"]).first()
    # assert user is not None

def test_register_duplicate_user(client, auth_tokens): # Usa auth_tokens para garantir que o user de teste já existe
    """Testa a tentativa de registrar um usuário com username já existente."""
    # auth_tokens já registrou TEST_USER["username"]
    response = client.post("/api/auth/register", json={
        "username": "testuser", # Username de TEST_USER
        "password": "anotherpassword"
    })
    assert response.status_code == 409
    assert response.json["msg"] == "Nome de usuário já cadastrado"

def test_register_missing_fields(client):
    """Testa o registro sem fornecer username ou password."""
    response_no_user = client.post("/api/auth/register", json={"password": "pass"})
    assert response_no_user.status_code == 400
    assert "Nome de usuário e senha são obrigatórios" in response_no_user.json["msg"]

    response_no_pass = client.post("/api/auth/register", json={"username": "user"})
    assert response_no_pass.status_code == 400
    assert "Nome de usuário e senha são obrigatórios" in response_no_pass.json["msg"]

# --- Testes de Login --- 

def test_login_success(client, auth_tokens): # auth_tokens garante que o usuário existe
    """Testa o login bem-sucedido."""
    # O login já foi feito na fixture auth_tokens, aqui apenas verificamos se funciona de novo
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "testpassword"
    })
    assert response.status_code == 200
    assert "access_token" in response.json
    assert "refresh_token" in response.json

def test_login_wrong_password(client, auth_tokens):
    """Testa o login com senha incorreta."""
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert response.json["msg"] == "Credenciais inválidas"

def test_login_nonexistent_user(client):
    """Testa o login com um usuário que não existe."""
    response = client.post("/api/auth/login", json={
        "username": "nonexistent",
        "password": "password"
    })
    assert response.status_code == 401 # Ou 404 dependendo da implementação, 401 é comum
    assert response.json["msg"] == "Credenciais inválidas"

def test_login_missing_fields(client):
    """Testa o login sem fornecer username ou password."""
    response_no_user = client.post("/api/auth/login", json={"password": "pass"})
    assert response_no_user.status_code == 400
    assert "Nome de usuário e senha são obrigatórios" in response_no_user.json["msg"]

    response_no_pass = client.post("/api/auth/login", json={"username": "user"})
    assert response_no_pass.status_code == 400
    assert "Nome de usuário e senha são obrigatórios" in response_no_pass.json["msg"]

# --- Testes de Refresh Token --- 

def test_refresh_token_success(client, auth_tokens):
    """Testa a atualização do token de acesso usando o refresh token."""
    refresh_token = auth_tokens["refresh_token"]
    response = client.post("/api/auth/refresh", headers={
        "Authorization": f"Bearer {refresh_token}"
    })
    assert response.status_code == 200
    assert "access_token" in response.json
    # O novo access token deve ser diferente do original (embora possa ser igual se gerado rápido)
    # assert response.json["access_token"] != auth_tokens["access_token"]

def test_refresh_token_with_access_token(client, headers):
    """Testa a tentativa de usar o access token na rota de refresh."""
    response = client.post("/api/auth/refresh", headers=headers) # Usa access token
    assert response.status_code == 401 # Ou 422 dependendo da config JWT
    assert "msg" in response.json # Mensagem pode variar: "Only refresh tokens are allowed", etc.

def test_refresh_token_no_token(client):
    """Testa a rota de refresh sem token."""
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401
    assert response.json["msg"] == "Missing Authorization Header"

# --- Testes de Rota Protegida --- 

def test_protected_route_success(client, headers):
    """Testa o acesso a uma rota protegida com um token válido."""
    response = client.get("/api/auth/protected", headers=headers)
    assert response.status_code == 200
    assert response.json["logged_in_as"] == "testuser"
    assert "user_id" in response.json

def test_protected_route_no_token(client):
    """Testa o acesso a uma rota protegida sem token."""
    response = client.get("/api/auth/protected")
    assert response.status_code == 401
    assert response.json["msg"] == "Missing Authorization Header"

def test_protected_route_invalid_token(client):
    """Testa o acesso a uma rota protegida com um token inválido."""
    response = client.get("/api/auth/protected", headers={
        "Authorization": "Bearer invalidtoken"
    })
    assert response.status_code == 401 # Ou 422
    assert "msg" in response.json # Mensagem pode variar: "Invalid token", "Token has expired", etc.

