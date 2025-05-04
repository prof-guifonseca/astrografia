# Usa uma imagem Python oficial enxuta
FROM python:3.11-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o arquivo de dependências
COPY requirements.txt .

# Instala as dependências
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia todo o projeto para dentro do contêiner
COPY . .

# Define o caminho correto para encontrar os módulos (opcional se setado no comando)
ENV PYTHONPATH=/app/backend

# Expõe a porta da aplicação
EXPOSE 5000

# Comando de inicialização (Gunicorn com a fábrica de app em backend.main:create_app)
CMD ["gunicorn", "backend.main:create_app", "--bind", "0.0.0.0:5000"]
