# -*- coding: utf-8 -*-
import os
import time
import logging
import functools
from datetime import datetime
from flask import Blueprint, request, jsonify
from kerykeion import AstrologicalSubject
import pytz

logger = logging.getLogger(__name__)
astro_bp = Blueprint("astro_bp", __name__, url_prefix="/astro")

# ───────────────────────────────────────────────
# 🔮 Efemérides: fallback local se necessário
# ───────────────────────────────────────────────
ephe_env = os.getenv("KEPHEMERIS_PATH")
local_ephe = os.path.join(os.path.dirname(__file__), "ephe")

if ephe_env and os.path.isdir(ephe_env):
    logger.info(f"Efemérides do ambiente: {ephe_env}")
elif os.path.isdir(local_ephe):
    os.environ["KERYKEION_EPHEMERIS_PATH"] = local_ephe
    import kerykeion
    kerykeion.KERYKEION_EPHEMERIS_PATH = local_ephe
    logger.info(f"Efemérides locais carregadas de {local_ephe}")
else:
    logger.warning("Efemérides não encontradas. Usando padrão do Kerykeion.")

# ───────────────────────────────────────────────
# 🔭 Constantes
# ───────────────────────────────────────────────
SIGNOS_MAP = {
    "Ari": "Áries", "Tau": "Touro", "Gem": "Gêmeos", "Can": "Câncer", 
    "Leo": "Leão", "Vir": "Virgem", "Lib": "Libra", "Sco": "Escorpião", 
    "Sag": "Sagitário", "Cap": "Capricórnio", "Aqu": "Aquário", "Pis": "Peixes"
}

PLANETAS = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", 
    "Saturn", "Uranus", "Neptune", "Pluto"
]

ICONS = {
    "Sun": "☀️", "Moon": "🌙", "Mercury": "☿️", "Venus": "♀️",
    "Mars": "♂️", "Jupiter": "♃", "Saturn": "♄",
    "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
    "Ascendant": "As", "Midheaven": "Mc"
}

# ───────────────────────────────────────────────
# 🧠 Função principal de cálculo
# ───────────────────────────────────────────────
@functools.lru_cache(maxsize=1024)
def calcular_mapa_kerykeion(name, year, month, day, hour, minute, lat, lon, tz_str, city="N/A"):
    try:
        subject = AstrologicalSubject(name, year, month, day, hour, minute, lat=lat, lng=lon, tz_str=tz_str, city=city)

        # Planetas
        planetas = []
        for p in PLANETAS:
            astro = getattr(subject, p.lower(), None)
            if astro:
                planetas.append({
                    "name": astro.name,
                    "sign": astro.sign,
                    "sign_name": SIGNOS_MAP.get(astro.sign, astro.sign),
                    "degree": round(astro.abs_pos, 4),
                    "sign_degree": round(astro.position, 2),
                    "element": astro.element,
                    "quality": astro.quality,
                    "retrograde": astro.retrograde,
                    "icon": ICONS.get(astro.name, "🔹")
                })

        # Ascendente
        asc = subject.first_house
        ascendente = {
            "sign": asc.sign,
            "sign_name": SIGNOS_MAP.get(asc.sign, asc.sign),
            "degree": round(asc.position % 30, 2),
            "abs_degree": round(asc.position, 4)
        }

        # Casas
        casas = []
        nomes = ["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"]
        for i, nome in enumerate(nomes, 1):
            casa = getattr(subject, f"{nome}_house", None)
            if casa:
                casas.append({
                    "house": i,
                    "sign": casa.sign,
                    "sign_name": SIGNOS_MAP.get(casa.sign, casa.sign),
                    "degree": round(casa.position % 30, 2),
                    "abs_degree": round(casa.position, 4)
                })

        return {
            "planets": planetas,
            "ascendant": ascendente,
            "houses": casas
        }

    except pytz.UnknownTimeZoneError:
        raise ValueError(f"Timezone inválida: '{tz_str}'. Use formato IANA (ex: 'America/Sao_Paulo').")
    except Exception as e:
        logger.error("Erro no cálculo astrológico", exc_info=True)
        raise RuntimeError(f"Erro interno: {e}")

# ───────────────────────────────────────────────
# 📡 Rota GET /positions
# ───────────────────────────────────────────────
@astro_bp.route("/positions", methods=["GET"])
def get_positions():
    start = time.time()

    # 📥 Parâmetros
    params = {
        "date": request.args.get("date"),
        "time": request.args.get("time"),
        "lat": request.args.get("lat"),
        "lon": request.args.get("lon"),
        "tz": request.args.get("tz"),
        "city": request.args.get("city", "N/A")
    }

    # 🔍 Verificação
    missing = [k for k, v in params.items() if not v and k != "city"]
    if missing:
        return jsonify({"error": f"Parâmetros ausentes: {', '.join(missing)}"}), 400

    try:
        birth_date = datetime.strptime(params["date"], "%Y-%m-%d")
        birth_time = datetime.strptime(params["time"], "%H:%M")
        lat = float(params["lat"])
        lon = float(params["lon"])
        pytz.timezone(params["tz"])  # validação

        mapa = calcular_mapa_kerykeion(
            "AstrografiaUser",
            birth_date.year, birth_date.month, birth_date.day,
            birth_time.hour, birth_time.minute,
            lat, lon, params["tz"], params["city"]
        )

        logger.info(f"🪐 Mapa calculado em {(time.time() - start):.3f}s")
        return jsonify(mapa)

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except RuntimeError as re:
        return jsonify({"error": str(re)}), 500
    except Exception as e:
        logger.error("Erro inesperado no endpoint /positions", exc_info=True)
        return jsonify({"error": "Erro inesperado no servidor."}), 500
