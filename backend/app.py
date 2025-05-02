import swisseph as swe
import os

# 📍 Caminho absoluto para efemérides — essencial para produção (Render)
ephe_path = os.path.dirname(os.path.abspath(__file__))
swe.set_ephe_path(ephe_path)

# ♈ Lista fixa de signos zodiacais
SIGNOS = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
]

# 🪐 Planetas considerados
PLANETAS = {
    'Sol': swe.SUN, 'Lua': swe.MOON, 'Mercúrio': swe.MERCURY, 'Vênus': swe.VENUS,
    'Marte': swe.MARS, 'Júpiter': swe.JUPITER, 'Saturno': swe.SATURN,
    'Urano': swe.URANUS, 'Netuno': swe.NEPTUNE
}

# ✨ Ícones correspondentes
ICONS = {
    'Sol': '☀️', 'Lua': '🌙', 'Mercúrio': '☿️', 'Vênus': '♀️',
    'Marte': '♂️', 'Júpiter': '♃', 'Saturno': '♄',
    'Urano': '♅', 'Netuno': '♆'
}

def grau_para_signo(degree):
    """Converte grau absoluto em (signo, grau relativo)."""
    if not isinstance(degree, (float, int)):
        raise TypeError(f"Grau inválido: {degree}")
    index = int(degree // 30) % 12
    return SIGNOS[index], round(degree % 30, 2)

def calcular_mapa(birth_date, birth_time, lat, lon):
    """
    Calcula posições planetárias e o ascendente com base em data/hora/local.

    Args:
        birth_date (str): 'YYYY-MM-DD'
        birth_time (str): 'HH:MM'
        lat (float): Latitude (-90 a 90)
        lon (float): Longitude (-180 a 180)

    Returns:
        dict: {
            'planets': [{ name, sign, degree, signDegree, icon }],
            'ascendant': { sign, degree }
        }
    """
    # 🛡️ Validação básica de entrada
    if not all([birth_date, birth_time, isinstance(lat, (float, int)), isinstance(lon, (float, int))]):
        raise ValueError("Parâmetros inválidos ou incompletos.")

    try:
        year, month, day = map(int, birth_date.split('-'))
        hour, minute = map(int, birth_time.split(':'))
    except Exception as e:
        raise ValueError("Data ou hora em formato inválido. Use YYYY-MM-DD e HH:MM.") from e

    decimal_hour = hour + minute / 60
    jd_ut = swe.julday(year, month, day, decimal_hour, swe.GREG_CAL)

    resultado = []

    # 🔭 Cálculo dos planetas
    for nome, pid in PLANETAS.items():
        try:
            pos = swe.calc_ut(jd_ut, pid)[0]  # Retorna [longitude, latitude, distância]
            lon_planeta = pos[0]
            signo, grau = grau_para_signo(lon_planeta)
            resultado.append({
                'name': nome,
                'sign': signo,
                'degree': round(lon_planeta, 2),
                'signDegree': grau,
                'icon': ICONS.get(nome, '🔹')
            })
        except Exception as e:
            print(f"⚠️ Erro ao calcular {nome}: {e}")
            continue

    # 🌅 Cálculo do Ascendente
    try:
        casas = swe.houses(jd_ut, float(lat), float(lon))
        asc = casas[0][0]  # Primeiro valor da primeira casa = ascendente
        signo_asc, grau_asc = grau_para_signo(asc)
        ascendente = {
            'sign': signo_asc,
            'degree': round(grau_asc, 2)
        }
    except Exception as e:
        print(f"⚠️ Erro ao calcular ascendente: {e}")
        ascendente = {
            'sign': 'Desconhecido',
            'degree': 0.0
        }

    return {
        'planets': resultado,
        'ascendant': ascendente
    }
