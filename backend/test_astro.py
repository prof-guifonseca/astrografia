# -*- coding: utf-8 -*-
import pytest

# Usa as fixtures definidas em conftest.py (client)

# --- Dados de Teste Válidos --- 
VALID_PARAMS = {
    "date": "1990-05-15",
    "time": "10:30",
    "lat": "-23.5505", # São Paulo Latitude
    "lon": "-46.6333", # São Paulo Longitude
    "tz": "America/Sao_Paulo",
    "city": "Sao Paulo" # Opcional
}

# --- Testes para /api/astro/positions --- 

def test_get_positions_success(client):
    """Testa o cálculo de posições com parâmetros válidos."""
    response = client.get("/api/astro/positions", query_string=VALID_PARAMS)
    assert response.status_code == 200
    data = response.get_json()
    assert "planets" in data
    assert "ascendant" in data
    assert "houses" in data
    assert isinstance(data["planets"], list)
    assert len(data["planets"]) > 0 # Deve retornar planetas
    assert "sign" in data["ascendant"]
    assert isinstance(data["houses"], list)
    assert len(data["houses"]) == 12 # Deve retornar 12 casas

def test_get_positions_missing_param(client):
    """Testa a requisição sem um parâmetro obrigatório."""
    params = VALID_PARAMS.copy()
    del params["lat"] # Remove latitude
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Parâmetros obrigatórios ausentes: lat" in response.json["error"]

def test_get_positions_invalid_date_format(client):
    """Testa a requisição com formato de data inválido."""
    params = VALID_PARAMS.copy()
    params["date"] = "15/05/1990"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Formato de data inválido" in response.json["error"]

def test_get_positions_invalid_time_format(client):
    """Testa a requisição com formato de hora inválido."""
    params = VALID_PARAMS.copy()
    params["time"] = "10h30m"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Formato de hora inválido" in response.json["error"]

def test_get_positions_invalid_latitude_value(client):
    """Testa a requisição com valor de latitude fora do range."""
    params = VALID_PARAMS.copy()
    params["lat"] = "95.0"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Latitude fora do intervalo" in response.json["error"]

def test_get_positions_invalid_latitude_format(client):
    """Testa a requisição com latitude não numérica."""
    params = VALID_PARAMS.copy()
    params["lat"] = "abc"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Latitude inválida" in response.json["error"]

def test_get_positions_invalid_longitude_value(client):
    """Testa a requisição com valor de longitude fora do range."""
    params = VALID_PARAMS.copy()
    params["lon"] = "-190.0"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Longitude fora do intervalo" in response.json["error"]

def test_get_positions_invalid_longitude_format(client):
    """Testa a requisição com longitude não numérica."""
    params = VALID_PARAMS.copy()
    params["lon"] = "xyz"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Longitude inválida" in response.json["error"]

def test_get_positions_invalid_timezone(client):
    """Testa a requisição com timezone inválida/desconhecida."""
    params = VALID_PARAMS.copy()
    params["tz"] = "Invalid/Timezone"
    response = client.get("/api/astro/positions", query_string=params)
    assert response.status_code == 400
    assert "error" in response.json
    assert "Timezone inválida ou desconhecida" in response.json["error"]

