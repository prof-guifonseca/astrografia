from flask import Flask, request, jsonify
from flask_cors import CORS
from astro_core import calcular_mapa
from gpt_interpreter import interpretar_mapa  # 👈 Importa a função GPT

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return '🪐 API do Astrografia online. Use POST em /positions ou /interpretar.'

@app.route('/positions', methods=['POST'])
def positions():
    data = request.get_json()
    try:
        mapa = calcular_mapa(
            data.get('birthDate'),
            data.get('birthTime'),
            data.get('lat'),
            data.get('lng')
        )
        return jsonify(mapa)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/interpretar', methods=['POST'])
def interpretar():
    data = request.get_json()
    tema = data.get('tema')
    planetas = data.get('planetas')
    nome = data.get('nome')
    ascendente = data.get('ascendant')

    if not tema or not planetas or not ascendente:
        return jsonify({'error': 'Dados incompletos para interpretação.'}), 400

    try:
        texto = interpretar_mapa(tema, planetas, nome, ascendente)
        return jsonify({'html': f"<div class='report-html'><p>{texto}</p></div>"})
    except Exception as e:
        return jsonify({'error': f'Erro ao interpretar: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
