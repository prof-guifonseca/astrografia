# 📦 Imagem base enxuta com Python 3.11
FROM python:3.11-slim

# 📁 Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 📜 Copia apenas o arquivo de dependências
COPY backend/requirements.txt ./requirements.txt

# 🔧 Instala pip atualizado e dependências
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 📦 Copia todo o código da aplicação
COPY backend/ .

# 🧭 Define o diretório atual como raiz dos módulos Python
ENV PYTHONPATH=/app

# 🚪 Exponha a porta padrão (para Render e Docker)
EXPOSE 5000

# 🚀 Inicia o servidor Flask com Gunicorn (usa porta dinâmica ou 5000)
CMD gunicorn main:app --bind 0.0.0.0:${PORT:-5000}
