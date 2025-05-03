# -*- coding: utf-8 -*-
import pytest
import os
import tempfile
from flask import Flask

# Ajustar imports para a nova estrutura src
from src import create_app, db
from src.models.models import User

# Define um usuário de teste com email
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword"
}

@pytest.fixture(scope="module")
def app():
    """Cria e configura uma nova instância do app para testes."""
    db_fd, db_path = tempfile.mkstemp()
    print(f"\nCriando banco de dados de teste em: {db_path}")
    _app = create_app("testing")
    _app.config.update({
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
    })
    with _app.app_context():
        db.create_all()
        print("Banco de dados de teste criado.")
    yield _app
    print(f"\nFechando e removendo banco de dados de teste: {db_path}")
    os.close(db_fd)
    os.unlink(db_path)
    print("Banco de dados de teste removido.")

@pytest.fixture(scope="module")
def client(app):
    """Um cliente de teste para o app."""
    return app.test_client()

@pytest.fixture(scope="module")
def runner(app):
    """Um runner para comandos CLI do Flask."""
    return app.test_cli_runner()

@pytest.fixture(scope="function")
def auth_tokens(client, app):
    """Registra um usuário de teste (usando email) e obtém tokens."""
    with app.app_context():
        existing_user = User.query.filter_by(email=TEST_USER["email"]).first()
        if existing_user:
            db.session.delete(existing_user)
            db.session.commit()
            # Corrigido: Usar aspas simples para a chave do dicionário dentro do f-string
            print(f"Usuário de teste {TEST_USER['email']} removido antes do registro.")

    register_response = client.post("/api/auth/register", json=TEST_USER)
    if register_response.status_code != 201:
        print(f"Falha ao registrar usuário de teste: {register_response.get_json()}")
    assert register_response.status_code == 201
    # Corrigido: Usar aspas simples para a chave do dicionário dentro do f-string
    print(f"Usuário de teste {TEST_USER['email']} registrado para obter tokens.")

    login_response = client.post("/api/auth/login", json=TEST_USER)
    if login_response.status_code != 200:
        print(f"Falha ao logar usuário de teste: {login_response.get_json()}")
    assert login_response.status_code == 200
    tokens = login_response.get_json()
    # Corrigido: Usar aspas simples para a chave do dicionário dentro do f-string
    print(f"Tokens obtidos para {TEST_USER['email']}.")

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"]
    }

@pytest.fixture(scope="function")
def headers(auth_tokens):
    """Cria cabeçalhos de autorização com o token de acesso."""
    return {
        "Authorization": f"Bearer {auth_tokens['access_token']}" # Usar aspas simples aqui também
    }

