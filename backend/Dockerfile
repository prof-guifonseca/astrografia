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

# 🚪 Exponha a porta usada pelo Render (boa prática)
EXPOSE 5000

# 🚀 Inicia o servidor Flask com Gunicorn, apontando para app.main:app
CMD ["gunicorn", "app.main:app", "--bind", "0.0.0.0:$PORT"]
