# 📦 Imagem base enxuta com Python 3.11
FROM python:3.11-slim

# 📁 Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 📜 Copia o arquivo de dependências
COPY requirements.txt .

# 🔧 Instala pip atualizado e as dependências do projeto
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 📦 Copia todo o conteúdo do projeto para dentro do contêiner
COPY . .

# 🧭 Garante que o Python reconheça o diretório backend como raiz de módulos
ENV PYTHONPATH=/app/backend

# 🚪 Expõe a porta que o Gunicorn usará
EXPOSE 5000

# 🚀 Inicia o app usando Gunicorn, com diretório backend como raiz
CMD ["gunicorn", "main:create_app", "--chdir", "backend", "--bind", "0.0.0.0:5000"]
