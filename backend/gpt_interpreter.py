import os
import openai

# 🔐 A chave deve estar definida no ambiente (Render > Environment Variables)
openai.api_key = os.getenv("OPENAI_API_KEY")

def interpretar_mapa(tema, planetas, nome, ascendente):
    """
    Gera uma interpretação astrológica personalizada com base em tema, planetas e ascendente.

    Parâmetros:
        tema (str): área da vida (ex: 'amor', 'carreira')
        planetas (list): lista de planetas com nome, signo e grau
        nome (str): nome do indivíduo
        ascendente (dict): {'sign': str, 'degree': float}

    Retorna:
        str: Interpretação textual gerada pelo GPT.
    """
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

    return resposta.choices[0].message["content"]
