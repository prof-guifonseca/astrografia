# 📦 Imagem base enxuta com Python 3.11
FROM python:3.11-slim

# 📁 Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 📜 Copia o arquivo de dependências
COPY requirements.txt .

# 🔧 Instala pip atualizado e as dependências do projeto
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 📦 Copia todo o conteúdo da pasta backend para /app
COPY . .

# 🧭 Define o diretório atual como raiz dos módulos Python
ENV PYTHONPATH=/app

# 🚪 Expõe a porta usada pelo Gunicorn
EXPOSE 5000

# 🚀 Inicia o servidor com Gunicorn usando main.py
CMD ["gunicorn", "main:create_app", "--bind", "0.0.0.0:5000"]
