from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
import datetime

app = Flask(__name__)
CORS(app)  # ✅ Libera CORS para chamadas do Netlify ou outros domínios

# 📍 Caminho para efemérides
swe.set_ephe_path('.')  # ou forneça o caminho real com arquivos SE, se necessário

@app.route('/')
def index():
    return '🪐 API do Astrografia online. Use POST em /positions.'

@app.route('/positions', methods=['POST'])
def calcular_posicoes():
    data = request.get_json()
    birth_date = data.get('birthDate')
    birth_time = data.get('birthTime')
    lat = data.get('lat')
    lon = data.get('lng')

    if not birth_date or not birth_time or lat is None or lon is None:
        return jsonify({'error': 'Parâmetros ausentes: certifique-se de enviar birthDate, birthTime, lat e lng.'}), 400

    try:
        # 📆 Conversão de data e hora
        year, month, day = map(int, birth_date.split('-'))
        hour, minute = map(int, birth_time.split(':'))
        decimal_hour = hour + minute / 60
        jd_ut = swe.julday(year, month, day, decimal_hour, swe.GREG_CAL)

        # 🔭 Planetas considerados
        planetas = {
            'Sol': swe.SUN, 'Lua': swe.MOON, 'Mercúrio': swe.MERCURY, 'Vênus': swe.VENUS,
            'Marte': swe.MARS, 'Júpiter': swe.JUPITER, 'Saturno': swe.SATURN,
            'Urano': swe.URANUS, 'Netuno': swe.NEPTUNE
        }

        # ✨ Ícones para cada planeta
        icons = {
            'Sol': '☀️', 'Lua': '🌙', 'Mercúrio': '☿️', 'Vênus': '♀️',
            'Marte': '♂️', 'Júpiter': '♃', 'Saturno': '♄',
            'Urano': '♅', 'Netuno': '♆'
        }

        signos = [
            'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
            'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
        ]

        def grau_para_signo(degree):
            index = int(degree // 30) % 12
            return signos[index], round(degree % 30, 2)

        resultado = []
        for nome, pid in planetas.items():
            lon_planeta, _ = swe.calc_ut(jd_ut, pid)[0:2]
            signo, grau = grau_para_signo(lon_planeta)
            resultado.append({
                'name': nome,
                'sign': signo,
                'degree': round(lon_planeta, 2),
                'signDegree': grau,
                'icon': icons.get(nome, '🔹')
            })

        # ☀️ Cálculo do Ascendente
        casas = swe.houses(jd_ut, float(lat), float(lon))
        asc = casas[0][0]
        signo_asc, grau_asc = grau_para_signo(asc)
        ascendente = {
            'sign': signo_asc,
            'degree': round(grau_asc, 2)
        }

        return jsonify({
            'planets': resultado,
            'ascendant': ascendente
        })

    except Exception as e:
        return jsonify({'error': f'Erro interno no cálculo: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
