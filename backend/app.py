from flask import Flask, request, jsonify
from flask_cors import CORS
from astro_core import calcular_mapa
from gpt_interpreter import interpretar_mapa
import traceback

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def index():
    return '🪐 API do Astrografia online. Use POST em /positions ou /interpretar.'

@app.route('/positions', methods=['POST', 'OPTIONS'])
def positions():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()

    required_fields = ['birthDate', 'birthTime', 'lat', 'lng']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'error': 'Parâmetros ausentes: birthDate, birthTime, lat e lng são obrigatórios.'}), 400

    try:
        mapa = calcular_mapa(
            data['birthDate'],
            data['birthTime'],
            float(data['lat']),
            float(data['lng'])
        )
        return jsonify(mapa)

    except Exception as e:
        print('🛑 Erro em /positions:\n', traceback.format_exc())
        return jsonify({'error': 'Erro interno ao calcular o mapa astral.'}), 500

@app.route('/interpretar', methods=['POST', 'OPTIONS'])
def interpretar():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    tema = data.get('tema')
    planetas = data.get('planetas')
    nome = data.get('nome')
    ascendente = data.get('ascendant')

    if not all([tema, planetas, nome, ascendente]):
        return jsonify({'error': 'Parâmetros incompletos para interpretação.'}), 400

    try:
        texto = interpretar_mapa(tema, planetas, nome, ascendente)
        return jsonify({'html': f"<div class='report-html'><p>{texto}</p></div>"})
    except Exception as e:
        print('🛑 Erro em /interpretar:\n', traceback.format_exc())
        return jsonify({'error': 'Erro interno ao gerar interpretação astrológica.'}), 500

if __name__ == '__main__':
    app.run(debug=True)
