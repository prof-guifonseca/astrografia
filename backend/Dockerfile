# 📦 Imagem base enxuta com Python 3.11
FROM python:3.11-slim

# 📁 Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 📜 Copia apenas requirements para cache de dependências
COPY requirements.txt ./

# 🔧 Instala pip atualizado e as dependências do projeto
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 📦 Copia o conteúdo restante do backend (estamos dentro da pasta /backend)
COPY . .

# 🧭 Define o diretório atual como raiz dos módulos Python
ENV PYTHONPATH=/app

# 🚪 Expõe a porta usada pelo Gunicorn
EXPOSE 5000

# 🚀 Inicia o servidor Flask com Gunicorn apontando para o app no main.py
CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:5000"]
