# -*- coding: utf-8 -*-
import os
import logging
import openai

logger = logging.getLogger(__name__)

# 🔐 Configuração da API da OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise EnvironmentError("❌ A variável de ambiente 'OPENAI_API_KEY' não está definida.")
openai.api_key = OPENAI_API_KEY

def interpretar_mapa(tema: str, planetas: list, nome: str, ascendente: dict) -> str:
    """
    Gera uma interpretação astrológica personalizada usando GPT.

    Args:
        tema (str): Tema da consulta (ex: "amor", "carreira").
        planetas (list): Lista de dicionários com dados dos planetas.
        nome (str): Nome da pessoa.
        ascendente (dict): Dicionário com 'sign' e 'degree' do ascendente.

    Returns:
        str: Texto interpretativo gerado pelo modelo GPT.
    """
    if not (tema and planetas and nome and ascendente):
        raise ValueError("⚠️ Todos os parâmetros são obrigatórios.")

    try:
        planetas_formatados = ', '.join(
            f"{p['name']}: {p['sign']} {p.get('sign_degree', p.get('signDegree', '?'))}°"
            for p in planetas
        )

        prompt = f"""
Você é um astrólogo experiente. Com base no seguinte mapa natal:

👤 Nome: {nome}
🌀 Ascendente: {ascendente['sign']} {ascendente['degree']}°
🪐 Planetas: {planetas_formatados}

➡️ Tema da interpretação: {tema.upper()}

Gere uma análise acolhedora, sensível e voltada ao autoconhecimento. Utilize linguagem próxima, respeitosa e com toques poéticos quando pertinente. Evite termos excessivamente técnicos.
"""

        resposta = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{ "role": "user", "content": prompt.strip() }],
            max_tokens=500,
            temperature=0.85
        )

        texto = resposta.choices[0].message["content"]
        return texto.strip()

    except Exception as e:
        logger.error("❌ Erro ao gerar interpretação com OpenAI GPT", exc_info=True)
        raise RuntimeError(f"Erro ao gerar interpretação astrológica: {e}")