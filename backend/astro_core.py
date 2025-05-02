import swisseph as swe
import os

# 📍 Caminho absoluto para efemérides — evita falhas no ambiente do Render
ephe_path = os.path.dirname(os.path.abspath(__file__))
swe.set_ephe_path(ephe_path)

# ♈ Lista de signos
SIGNOS = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
]

# 🪐 Códigos dos planetas no Swiss Ephemeris
PLANETAS = {
    'Sol': swe.SUN, 'Lua': swe.MOON, 'Mercúrio': swe.MERCURY, 'Vênus': swe.VENUS,
    'Marte': swe.MARS, 'Júpiter': swe.JUPITER, 'Saturno': swe.SATURN,
    'Urano': swe.URANUS, 'Netuno': swe.NEPTUNE
}

# ✨ Ícones astrológicos
ICONS = {
    'Sol': '☀️', 'Lua': '🌙', 'Mercúrio': '☿️', 'Vênus': '♀️',
    'Marte': '♂️', 'Júpiter': '♃', 'Saturno': '♄',
    'Urano': '♅', 'Netuno': '♆'
}

def grau_para_signo(degree):
    """Converte grau absoluto em signo e grau dentro do signo."""
    index = int(degree // 30) % 12
    return SIGNOS[index], round(degree % 30, 2)

def calcular_mapa(birth_date, birth_time, lat, lon):
    """
    Calcula posições planetárias e ascendente com base em data, hora e coordenadas.

    Parâmetros:
        birth_date (str): formato YYYY-MM-DD
        birth_time (str): formato HH:MM
        lat (float): latitude do local
        lon (float): longitude do local

    Retorno:
        dict com lista de planetas e ascendente
    """
    # 📆 Conversão da data/hora
    year, month, day = map(int, birth_date.split('-'))
    hour, minute = map(int, birth_time.split(':'))
    decimal_hour = hour + minute / 60
    jd_ut = swe.julday(year, month, day, decimal_hour, swe.GREG_CAL)

    # 🔭 Planetas
    resultado = []
    for nome, pid in PLANETAS.items():
        lon_planeta, _ = swe.calc_ut(jd_ut, pid)[0:2]
        signo, grau = grau_para_signo(lon_planeta)
        resultado.append({
            'name': nome,
            'sign': signo,
            'degree': round(lon_planeta, 2),
            'signDegree': grau,
            'icon': ICONS.get(nome, '🔹')
        })

    # 🌅 Ascendente (1ª casa)
    casas = swe.houses(jd_ut, float(lat), float(lon))
    asc = casas[0][0]
    signo_asc, grau_asc = grau_para_signo(asc)

    return {
        'planets': resultado,
        'ascendant': {
            'sign': signo_asc,
            'degree': round(grau_asc, 2)
        }
    }
