# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
import time
import traceback
import os
import functools # Import functools for lru_cache
from kerykeion import AstrologicalSubject, KERYKEION_EPHEMERIS_PATH # Import KERYKEION_EPHEMERIS_PATH
from datetime import datetime
import pytz # Para validação de timezone

# Define o caminho para as efemérides dentro do diretório src
# Isso pode ser sobrescrito pela variável de ambiente KEPHEMERIS_PATH se definida
MODULE_EPHE_PATH = os.path.join(os.path.dirname(__file__), "ephe")

# Define o caminho que Kerykeion usará, priorizando a variável de ambiente
# Kerykeion usa kerykeion.KERYKEION_EPHEMERIS_PATH por padrão, que pode ser setado.
# Vamos tentar setar programaticamente se a variável de ambiente existir.
ephe_path_from_env = os.environ.get("KEPHEMERIS_PATH")
if ephe_path_from_env and os.path.isdir(ephe_path_from_env):
    # Kerykeion não tem uma função set_ephemeris_path direta documentada publicamente,
    # mas podemos tentar definir a variável global que ele usa internamente.
    # Isso é um pouco hacky e pode quebrar em futuras versões do Kerykeion.
    # Uma abordagem mais segura seria verificar se Kerykeion lê a variável de ambiente.
    # Pela análise do código Kerykeion (v4.26.2), ele lê KERYKEION_EPHEMERIS_PATH.
    # Apenas garantir que a variável de ambiente seja definida (no Dockerfile/ambiente) é suficiente.
    print(f"Usando KEPHEMERIS_PATH do ambiente: {ephe_path_from_env}")
    # kerykeion.KERYKEION_EPHEMERIS_PATH = ephe_path_from_env # Não é necessário se a env var for lida
elif os.path.isdir(MODULE_EPHE_PATH):
    print(f"Variável KEPHEMERIS_PATH não definida ou inválida, tentando usar caminho local: {MODULE_EPHE_PATH}")
    # Define a variável global para Kerykeion usar o caminho local se a env var não estiver definida
    # Isso garante que funcione localmente mesmo sem a env var
    os.environ["KERYKEION_EPHEMERIS_PATH"] = MODULE_EPHE_PATH 
    # Atualiza a variável interna do Kerykeion para refletir a mudança
    import kerykeion
    kerykeion.KERYKEION_EPHEMERIS_PATH = MODULE_EPHE_PATH
else:
    print("AVISO: Diretório de efemérides local não encontrado e KEPHEMERIS_PATH não definido/inválido. Kerykeion usará seu padrão.")

astro_bp = Blueprint("astro_bp", __name__) # Removido url_prefix

# --- Constantes Astrológicas (mantidas) --- 
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
    "Uranus": "♅", "Neptune": "♆",
    "Pluto": "♇", 
    "Ascendant": "As", 
    "Midheaven": "Mc"
}

# --- Cálculo Astrológico Principal com Kerykeion (Refinado com Cache) --- 

# Aplicando cache LRU à função de cálculo principal
# O tamanho do cache (maxsize) pode ser ajustado conforme necessário
@functools.lru_cache(maxsize=1024)
def calcular_mapa_kerykeion(name, year, month, day, hour, minute, lat, lon, tz_str, city="N/A"):
    """Calcula o mapa astral usando Kerykeion com cache. Requer coordenadas e timezone explícitos."""
    start_time = time.time()
    print(f"Calculando mapa (sem cache ou cache miss) para: {name}, {year}-{month}-{day} {hour}:{minute}, lat:{lat}, lon:{lon}, tz:{tz_str}")
    try:
        # Validação adicional dos parâmetros numéricos
        if not (isinstance(year, int) and isinstance(month, int) and isinstance(day, int) and 
                isinstance(hour, int) and isinstance(minute, int) and 
                isinstance(lat, float) and isinstance(lon, float)):
            raise ValueError("Tipos de dados inválidos para cálculo.")
            
        # Kerykeion usará o KERYKEION_EPHEMERIS_PATH definido globalmente ou via env var
        subject = AstrologicalSubject(name, year, month, day, hour, minute, lat=lat, lng=lon, tz_str=tz_str, city=city)

        planets_data = []
        for planet_name in PLANET_NAMES_KERYKEION:
            try:
                planet_obj = getattr(subject, planet_name.lower())
                planets_data.append({
                    "name": planet_obj.name,
                    "sign": planet_obj.sign,
                    "sign_name": SIGNOS_MAP.get(planet_obj.sign, planet_obj.sign),
                    "degree": round(planet_obj.abs_pos, 4),
                    "sign_degree": round(planet_obj.position, 2),
                    "element": planet_obj.element,
                    "quality": planet_obj.quality,
                    "retrograde": planet_obj.retrograde,
                    "icon": ICONS.get(planet_obj.name, "🔹")
                })
            except AttributeError:
                print(f"Aviso: Atributo para planeta {planet_name} não encontrado em Kerykeion.")
            except Exception as planet_e:
                 print(f"Erro ao processar planeta {planet_name}: {planet_e}")
                 traceback.print_exc()
        
        # Cálculo do Ascendente e Casas
        try:
            asc_obj = subject.first_house
            ascendant_data = {
                "sign": asc_obj.sign,
                "sign_name": SIGNOS_MAP.get(asc_obj.sign, asc_obj.sign),
                "degree": round(asc_obj.position % 30, 2),
                "abs_degree": round(asc_obj.position, 4)
            }
        except Exception as asc_e:
            print(f"Erro ao obter Ascendente: {asc_e}")
            traceback.print_exc()
            raise ValueError(f"Falha ao calcular Ascendente: {asc_e}")

        houses_data = []
        house_attrs = [
            "first_house", "second_house", "third_house", "fourth_house",
            "fifth_house", "sixth_house", "seventh_house", "eighth_house",
            "ninth_house", "tenth_house", "eleventh_house", "twelfth_house"
        ]
        for i, attr_name in enumerate(house_attrs):
            try:
                house_obj = getattr(subject, attr_name)
                houses_data.append({
                    "house": i + 1,
                    "sign": house_obj.sign,
                    "sign_name": SIGNOS_MAP.get(house_obj.sign, house_obj.sign),
                    "degree": round(house_obj.position % 30, 2),
                    "abs_degree": round(house_obj.position, 4)
                })
            except AttributeError:
                 print(f"Aviso: Atributo para casa {i+1} ({attr_name}) não encontrado.")
                 raise ValueError(f"Falha ao calcular Casa {i+1}")
            except Exception as house_e:
                 print(f"Erro ao processar casa {i+1}: {house_e}")
                 traceback.print_exc()
                 raise ValueError(f"Falha ao calcular Casa {i+1}: {house_e}")

        end_time = time.time()
        print(f"Tempo de cálculo Kerykeion (real): {end_time - start_time:.4f}s")

        return {
            "planets": planets_data,
            "ascendant": ascendant_data,
            "houses": houses_data
        }

    except pytz.exceptions.UnknownTimeZoneError:
        print(f"Erro: Timezone desconhecida fornecida: {tz_str}")
        raise ValueError(f"Timezone inválida ou desconhecida: 
'{tz_str}\". Use um formato padrão (ex: \'America/Sao_Paulo\').")
    except ValueError as ve:
        print(f"Erro de valor durante cálculo Kerykeion: {ve}")
        raise ve 
    except Exception as e:
        print(f"Erro CRÍTICO inesperado ao calcular mapa com Kerykeion: {e}")
        traceback.print_exc()
        raise RuntimeError(f"Erro interno no cálculo astrológico: {e}")

# --- Endpoint Astrológico (Refinado) --- 

@astro_bp.route("/positions", methods=["GET"])
def get_positions():
    start_request_time = time.time()
    
    # Parâmetros Obrigatórios
    birth_date_str = request.args.get("date")
    birth_time_str = request.args.get("time")
    lat_str = request.args.get("lat")
    lon_str = request.args.get("lon")
    tz_str = request.args.get("tz")
    city = request.args.get("city", "N/A") # Opcional

    # --- Validação Rigorosa dos Parâmetros --- 
    required_params = {
        "date": birth_date_str,
        "time": birth_time_str,
        "lat": lat_str,
        "lon": lon_str,
        "tz": tz_str
    }
    missing_params = [key for key, value in required_params.items() if value is None or value.strip() == ""]
    if missing_params:
        return jsonify({"error": f"Parâmetros obrigatórios ausentes: {', '.join(missing_params)}"}), 400

    try:
        # Validações (mantidas como antes)
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
            year, month, day = birth_date.year, birth_date.month, birth_date.day
        except ValueError:
            raise ValueError("Formato de data inválido. Use YYYY-MM-DD.")
        try:
            birth_time = datetime.strptime(birth_time_str, "%H:%M")
            hour, minute = birth_time.hour, birth_time.minute
        except ValueError:
            raise ValueError("Formato de hora inválido. Use HH:MM.")
        try:
            lat = float(lat_str)
            if not (-90 <= lat <= 90):
                raise ValueError("Latitude fora do intervalo [-90, 90].")
        except ValueError:
            raise ValueError("Latitude inválida. Deve ser um número.")
        try:
            lon = float(lon_str)
            if not (-180 <= lon <= 180):
                raise ValueError("Longitude fora do intervalo [-180, 180].")
        except ValueError:
            raise ValueError("Longitude inválida. Deve ser um número.")
        try:
            pytz.timezone(tz_str)
        except pytz.exceptions.UnknownTimeZoneError:
            raise ValueError(f"Timezone inválida ou desconhecida: 
'{tz_str}\". Use um formato padrão IANA (ex: \'America/Sao_Paulo\').")

    except ValueError as ve:
        return jsonify({"error": f"Parâmetro inválido: {ve}"}), 400
    except Exception as e:
        print(f"Erro inesperado ao processar parâmetros: {e}")
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao processar parâmetros da requisição."}), 500

    # --- Chamada para Cálculo Astrológico --- 
    try:
        # Chama a função cacheada
        mapa_astral = calcular_mapa_kerykeion(
            name="AstrografiaUser", 
            year=year, month=month, day=day, 
            hour=hour, minute=minute, 
            lat=lat, lon=lon, tz_str=tz_str,
            city=city
        )
        
        end_request_time = time.time()
        # Log para verificar se o cache foi usado (tempo deve ser muito baixo em hits)
        print(f"Tempo total da requisição /positions (incluindo possível cache hit): {end_request_time - start_request_time:.4f}s")
        return jsonify(mapa_astral)

    except ValueError as ve:
        return jsonify({"error": f"Erro no cálculo: {ve}"}), 400
    except RuntimeError as re:
        return jsonify({"error": f"Erro interno no servidor durante o cálculo: {re}"}), 500
    except Exception as e:
        print(f"Erro inesperado ao chamar calcular_mapa_kerykeion: {e}") 
        traceback.print_exc()
        return jsonify({"error": "Erro interno inesperado no servidor."}), 500

