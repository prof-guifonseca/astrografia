# -*- coding: utf-8 -*-
import os
import logging
import openai

# Configuração de logging
logger = logging.getLogger(__name__)

# 🔐 Chave da API: esperada como variável de ambiente
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise EnvironmentError("A variável de ambiente 'OPENAI_API_KEY' não está definida.")
openai.api_key = api_key

def interpretar_mapa(tema: str, planetas: list, nome: str, ascendente: dict) -> str:
    """
    Gera uma interpretação astrológica personalizada usando o modelo GPT.

    Parâmetros:
        tema (str): Área de interesse (ex: "amor", "carreira", "família").
        planetas (list): Lista de dicionários com informações planetárias.
        nome (str): Nome da pessoa consultante.
        ascendente (dict): {'sign': str, 'degree': float}

    Retorna:
        str: Texto interpretativo gerado pelo modelo.
    """
    if not tema or not planetas or not nome or not ascendente:
        raise ValueError("Todos os parâmetros são obrigatórios para a interpretação.")

    try:
        lista_planetas = ', '.join(
            f"{p['name']}: {p['sign']} {p['signDegree']}°" for p in planetas
        )

        prompt = f"""
Você é um astrólogo profissional. Com base no seguinte mapa astral:

Nome: {nome}
Ascendente: {ascendente['sign']} {ascendente['degree']}°
Planetas: {lista_planetas}

Gere uma interpretação personalizada para o tema: {tema.upper()}.
Fale de forma acolhedora, sensível e com foco no autoconhecimento.
"""

        resposta = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{ "role": "user", "content": prompt }],
            max_tokens=400,
            temperature=0.85
        )

        texto = resposta.choices[0].message["content"]
        return texto.strip()

    except Exception as e:
        logger.error("Erro ao gerar interpretação com OpenAI GPT", exc_info=True)
        raise RuntimeError(f"Erro ao gerar interpretação astrológica: {e}")
