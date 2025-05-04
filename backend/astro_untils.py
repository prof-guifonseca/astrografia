# -*- coding: utf-8 -*-
"""
Módulo responsável por cálculos astrológicos e geração de interpretações com GPT.
"""
import os
import time
import logging
import functools
from datetime import datetime

from flask import Blueprint, request, jsonify
from kerykeion import AstrologicalSubject
import pytz
import openai

# 🔧 Logger
logger = logging.getLogger(__name__)
astro_bp = Blueprint("astro_bp", __name__, url_prefix="/astro")

# 🔐 OpenAI API Key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise EnvironmentError("❌ A variável de ambiente 'OPENAI_API_KEY' não está definida.")
openai.api_key = OPENAI_API_KEY

# 🔭 Efemérides
ephe_env = os.getenv("KEPHEMERIS_PATH")
local_ephe = os.path.join(os.path.dirname(__file__), "ephe")

if ephe_env and os.path.isdir(ephe_env):
    logger.info(f"Efemérides do ambiente: {ephe_env}")
    os.environ["KERYKEION_EPHEMERIS_PATH"] = ephe_env
elif os.path.isdir(local_ephe):
    os.environ["KERYKEION_EPHEMERIS_PATH"] = local_ephe
    logger.info(f"Efemérides locais carregadas de {local_ephe}")
else:
    logger.warning(f"Efemérides não encontradas. Tentado: {ephe_env} e {local_ephe}. Usando padrão do Kerykeion.")

# 🌌 Constantes
SIGNOS_MAP = {
    "Ari": "Áries", "Tau": "Touro", "Gem": "Gêmeos", "Can": "Câncer",
    "Leo": "Leão", "Vir": "Virgem", "Lib": "Libra", "Sco": "Escorpião",
    "Sag": "Sagitário", "Cap": "Capricórnio", "Aqu": "Aquário", "Pis": "Peixes"
}
PLANETAS = [
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
]
ICONS = {
    "Sun": "☀️", "Moon": "🌙", "Mercury": "☿️", "Venus": "♀️", "Mars": "♂️",
    "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆",
    "Pluto": "♇", "Ascendant": "As", "Midheaven": "Mc"
}

# 🧠 Cálculo do mapa natal
@functools.lru_cache(maxsize=1024)
def calcular_mapa_kerykeion(
    name: str, year: int, month: int, day: int,
    hour: int, minute: int, lat: float, lon: float,
    tz_str: str, city: str = "N/A"
) -> dict:
    try:
        subject = AstrologicalSubject(
            name, year, month, day, hour, minute, lat=lat, lng=lon, tz_str=tz_str, city=city
        )

        planetas = [{
            "name": p.name,
            "sign": p.sign,
            "sign_name": SIGNOS_MAP.get(p.sign, p.sign),
            "degree": round(p.abs_pos, 4),
            "sign_degree": round(p.position, 2),
            "element": p.element,
            "quality": p.quality,
            "retrograde": p.retrograde,
            "icon": ICONS.get(p.name, "🔹")
        } for p in (getattr(subject, planet.lower()) for planet in PLANETAS) if p]

        asc = subject.first_house
        ascendente = {
            "sign": asc.sign,
            "sign_name": SIGNOS_MAP.get(asc.sign, asc.sign),
            "degree": round(asc.position % 30, 2),
            "abs_degree": round(asc.position, 4)
        }

        casas = [
            {
                "house": i,
                "sign": casa.sign,
                "sign_name": SIGNOS_MAP.get(casa.sign, casa.sign),
                "degree": round(casa.position % 30, 2),
                "abs_degree": round(casa.position, 4)
            }
            for i, nome in enumerate([
                "first", "second", "third", "fourth", "fifth", "sixth",
                "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"
            ], 1)
            if (casa := getattr(subject, f"{nome}_house", None))
        ]

        return {
            "planets": planetas,
            "ascendant": ascendente,
            "houses": casas
        }

    except pytz.UnknownTimeZoneError:
        raise ValueError(f"Timezone inválida: '{tz_str}'. Use formato IANA.")
    except Exception as e:
        logger.error("Erro no cálculo astrológico", exc_info=True)
        raise RuntimeError(f"Erro interno: {e}")

# 🤖 Interpretação via GPT
def interpretar_mapa(tema: str, planetas: list, nome: str, ascendente: dict) -> str:
    if not (tema and planetas and nome and ascendente):
        raise ValueError("⚠️ Todos os parâmetros são obrigatórios.")

    try:
        planetas_formatados = ', '.join(
            f"{p['name']}: {p['sign']} {p.get('sign_degree', '?')}°"
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
            messages=[{"role": "user", "content": prompt.strip()}],
            max_tokens=500,
            temperature=0.85
        )

        return resposta.choices[0].message["content"].strip()

    except Exception as e:
        logger.error("Erro ao gerar interpretação com GPT", exc_info=True)
        return "⚠️ Não foi possível gerar a interpretação no momento. Tente novamente mais tarde."

# 🌐 Endpoint GET /astro/positions
@astro_bp.route("/positions", methods=["GET"])
def get_positions():
    start = time.time()
    params = {k: request.args.get(k) for k in ["date", "time", "lat", "lon", "tz"]}
    params["city"] = request.args.get("city", "N/A")
    params["name"] = request.args.get("name", "AstrografiaUser")

    missing = [k for k, v in params.items() if not v and k not in ["city", "name"]]
    if missing:
        return jsonify({"error": f"Parâmetros ausentes: {', '.join(missing)}"}), 400

    try:
        birth_date = datetime.strptime(params["date"], "%Y-%m-%d")
        birth_time = datetime.strptime(params["time"], "%H:%M")
        try:
            lat = float(params["lat"])
            lon = float(params["lon"])
        except ValueError:
            return jsonify({"error": "Latitude e longitude devem ser números válidos."}), 400

        pytz.timezone(params["tz"])  # valida timezone

        mapa = calcular_mapa_kerykeion(
            params["name"], birth_date.year, birth_date.month, birth_date.day,
            birth_time.hour, birth_time.minute, lat, lon, params["tz"], params["city"]
        )

        logger.info(f"🪐 Mapa calculado em {(time.time() - start):.3f}s")
        return jsonify(mapa)

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except RuntimeError as re:
        return jsonify({"error": str(re)}), 500
    except Exception:
        logger.exception("Erro inesperado no endpoint /positions")
        return jsonify({"error": "Erro inesperado no servidor."}), 500
