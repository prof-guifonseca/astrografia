from flask import Flask, request, jsonify
import swisseph as swe
import datetime

app = Flask(__name__)

# 📍 Caminho para efemérides internas do Swiss Ephemeris
swe.set_ephe_path('.')

@app.route('/positions', methods=['POST'])
def calcular_posicoes():
    data = request.get_json()
    birth_date = data.get('birthDate')
    birth_time = data.get('birthTime')
    lat = float(data.get('lat'))
    lon = float(data.get('lng'))

    if not birth_date or not birth_time:
        return jsonify({'error': 'Data e hora de nascimento são obrigatórias.'}), 400

    try:
        # 🧮 Conversão de data/hora para juliano
        year, month, day = map(int, birth_date.split('-'))
        hour, minute = map(int, birth_time.split(':'))
        decimal_hour = hour + minute / 60
        jd_ut = swe.julday(year, month, day, decimal_hour, swe.GREG_CAL)

        # 🔭 Planetas relevantes
        planetas = {
            'Sol': swe.SUN, 'Lua': swe.MOON, 'Mercúrio': swe.MERCURY, 'Vênus': swe.VENUS,
            'Marte': swe.MARS, 'Júpiter': swe.JUPITER, 'Saturno': swe.SATURN,
            'Urano': swe.URANUS, 'Netuno': swe.NEPTUNE
        }

        # 🔤 Ícones dos planetas
        icons = {
            'Sol': '☀️', 'Lua': '🌙', 'Mercúrio': '☿️', 'Vênus': '♀️',
            'Marte': '♂️', 'Júpiter': '♃', 'Saturno': '♄',
            'Urano': '♅', 'Netuno': '♆'
        }

        # ♈ Lista de signos
        signos = [
            'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
            'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
        ]

        def grau_para_signo(degree):
            index = int(degree // 30) % 12
            return signos[index], round(degree % 30, 2)

        resultado = []

        for nome, pid in planetas.items():
            lon, _ = swe.calc_ut(jd_ut, pid)[0:2]
            signo, grau = grau_para_signo(lon)
            resultado.append({
                'name': nome,
                'sign': signo,
                'degree': round(lon, 2),
                'signDegree': grau,
                'icon': icons.get(nome, '🔹')
            })

        # ☀️ Ascendente
        casas = swe.houses(jd_ut, lat, lon)
        asc = casas[0][0]  # Casa 1
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
        return jsonify({'error': f'Erro ao calcular: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
