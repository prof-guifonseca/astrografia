# -*- coding: utf-8 -*-
import os
from src import create_app # Importa a factory de src/__init__.py

# Obtém o nome da configuração do ambiente (development, testing, production)
# O padrão é 'development' se FLASK_ENV não estiver definido
config_name = os.getenv("FLASK_ENV", "default")

# Cria a instância do app usando a factory
app = create_app(config_name)

if __name__ == "__main__":
    # Obtém a porta do ambiente ou usa 5000 como padrão
    port = int(os.environ.get("PORT", 5000))
    # Executa o app
    # debug=True deve ser controlado pela configuração (ex: DevelopmentConfig)
    app.run(host="0.0.0.0", port=port)

