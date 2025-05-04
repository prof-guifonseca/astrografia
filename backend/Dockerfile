# 📦 Imagem base enxuta com Python 3.11
FROM python:3.11-slim

# 📁 Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 📜 Copia apenas o arquivo de dependências
COPY app/requirements.txt ./requirements.txt

# 🔧 Instala pip atualizado e as dependências
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 📦 Copia o restante da aplicação
COPY app/ ./app

# 🧭 Define o diretório atual como raiz dos módulos Python
ENV PYTHONPATH=/app

# 🚪 Porta padrão exposta (boa prática para Render)
EXPOSE 5000

# 🚀 Inicia o servidor Flask com Gunicorn
# Usa porta dinâmica via $PORT se definida (Render), senão fallback para 5000
CMD sh -c 'exec gunicorn app.main:app --bind 0.0.0.0:${PORT:-5000}'
