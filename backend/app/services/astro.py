# -*- coding: utf-8 -*-
import os
import time
import logging
import traceback
import functools
from datetime import datetime
from flask import Blueprint, request, jsonify
from kerykeion import AstrologicalSubject
import pytz

# Logger para produção
logger = logging.getLogger(__name__)

astro_bp = Blueprint("astro_bp", __name__)

# --- Efemérides: fallback para execução local ---
MODULE_EPHE_PATH = os.path.join(os.path.dirname(__file__), "ephe")
ephe_path_from_env = os.environ.get("KEPHEMERIS_PATH")

if ephe_path_from_env and os.path.isdir(ephe_path_from_env):
    logger.info(f"Usando efemérides do ambiente: {ephe_path_from_env}")
else:
    if os.path.isdir(MODULE_EPHE_PATH):
        os.environ["KERYKEION_EPHEMERIS_PATH"] = MODULE_EPHE_PATH
        import kerykeion
        kerykeion.KERYKEION_EPHEMERIS_PATH = MODULE_EPHE_PATH
        logger.info(f"Efemérides locais carregadas de {MODULE_EPHE_PATH}")
    else:
        logger.warning("Efemérides não encontradas. Usando configuração padrão do Kerykeion.")

# --- Constantes ---
SIGNOS_MAP = {
    "Ari": "Áries", "Tau": "Touro", "Gem": "Gêmeos", "Can": "Câncer", 
    "Leo": "Leão", "Vir": "Virgem", "Lib": "Libra", "Sco": "Escorpião", 
    "Sag": "Sagitário", "Cap": "Capricórnio", "Aqu": "Aquário", "Pis": "Peixes"
}
PLANET_NAMES_KERYKEION = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", 
    "Saturn", "Uranus", "Neptune", "Pluto"
]
ICONS = {
    "Sun": "☀️", "Moon": "🌙", "Mercury": "☿️", "Venus": "♀️",
    "Mars": "♂️", "Jupiter": "♃", "Saturn": "♄",
    "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
    "Ascendant": "As", "Midheaven": "Mc"
}

# --- Serviço de cálculo ---
@functools.lru_cache(maxsize=1024)
def calcular_mapa_kerykeion(name, year, month, day, hour, minute, lat, lon, tz_str, city="N/A"):
    try:
        subject = AstrologicalSubject(name, year, month, day, hour, minute, lat=lat, lng=lon, tz_str=tz_str, city=city)

        planets_data = []
        for planet in PLANET_NAMES_KERYKEION:
            obj = getattr(subject, planet.lower(), None)
            if obj:
                planets_data.append({
                    "name": obj.name,
                    "sign": obj.sign,
                    "sign_name": SIGNOS_MAP.get(obj.sign, obj.sign),
                    "degree": round(obj.abs_pos, 4),
                    "sign_degree": round(obj.position, 2),
                    "element": obj.element,
                    "quality": obj.quality,
                    "retrograde": obj.retrograde,
                    "icon": ICONS.get(obj.name, "🔹")
                })

        asc = subject.first_house
        ascendant = {
            "sign": asc.sign,
            "sign_name": SIGNOS_MAP.get(asc.sign, asc.sign),
            "degree": round(asc.position % 30, 2),
            "abs_degree": round(asc.position, 4)
        }

        houses = []
        for i in range(1, 13):
            attr = f"{['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'][i-1]}_house"
            casa = getattr(subject, attr, None)
            if casa:
                houses.append({
                    "house": i,
                    "sign": casa.sign,
                    "sign_name": SIGNOS_MAP.get(casa.sign, casa.sign),
                    "degree": round(casa.position % 30, 2),
                    "abs_degree": round(casa.position, 4)
                })

        return {
            "planets": planets_data,
            "ascendant": ascendant,
            "houses": houses
        }

    except pytz.UnknownTimeZoneError:
        raise ValueError(f"Timezone inválida ou desconhecida: '{tz_str}'. Use formato IANA (ex: 'America/Sao_Paulo').")
    except Exception as e:
        logger.error("Erro ao calcular mapa astrológico", exc_info=True)
        raise RuntimeError(f"Erro interno no cálculo astrológico: {e}")

# --- Rota GET /positions ---
@astro_bp.route("/positions", methods=["GET"])
def get_positions():
    start = time.time()

    # 🧾 Parâmetros obrigatórios
    date_str  = request.args.get("date")
    time_str  = request.args.get("time")
    lat_str   = request.args.get("lat")
    lon_str   = request.args.get("lon")
    tz_str    = request.args.get("tz")
    city      = request.args.get("city", "N/A")

    # 🧪 Validação
    missing = [k for k, v in {"date": date_str, "time": time_str, "lat": lat_str, "lon": lon_str, "tz": tz_str}.items() if not v]
    if missing:
        return jsonify({"error": f"Parâmetros obrigatórios ausentes: {', '.join(missing)}"}), 400

    try:
        birth_date = datetime.strptime(date_str, "%Y-%m-%d")
        birth_time = datetime.strptime(time_str, "%H:%M")
        year, month, day = birth_date.year, birth_date.month, birth_date.day
        hour, minute = birth_time.hour, birth_time.minute
        lat, lon = float(lat_str), float(lon_str)
        pytz.timezone(tz_str)  # validação

    except ValueError as ve:
        return jsonify({"error": f"Parâmetro inválido: {ve}"}), 400
    except pytz.UnknownTimeZoneError:
        return jsonify({"error": f"Timezone inválida ou desconhecida: '{tz_str}'. Use formato IANA (ex: 'America/Sao_Paulo')."}), 400

    try:
        mapa = calcular_mapa_kerykeion("AstrografiaUser", year, month, day, hour, minute, lat, lon, tz_str, city)
        logger.info(f"Mapa calculado com sucesso em {(time.time() - start):.3f}s")
        return jsonify(mapa)
    except ValueError as ve:
        return jsonify({"error": f"Erro no cálculo: {ve}"}), 400
    except RuntimeError as re:
        return jsonify({"error": f"Erro interno no servidor durante o cálculo: {re}"}), 500
    except Exception as e:
        logger.error("Erro inesperado ao calcular mapa", exc_info=True)
        return jsonify({"error": "Erro inesperado no servidor."}), 500
