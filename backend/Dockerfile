# Use uma imagem Python oficial como base
FROM python:3.11-slim

# Define o diretório de trabalho no contêiner
WORKDIR /app

# Copia o arquivo de dependências
COPY requirements.txt requirements.txt

# Instala as dependências
# --no-cache-dir para não armazenar cache e reduzir o tamanho da imagem
# --upgrade pip para garantir a versão mais recente do pip
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação para o diretório de trabalho
# Inclui a pasta 'ephe' com os arquivos de efemérides
COPY . .

# Expõe a porta que o Flask vai rodar
EXPOSE 5000

# Define a variável de ambiente para o Flask encontrar o app (opcional se usar app.py)
# ENV FLASK_APP=app.py

# Comando para rodar a aplicação quando o contêiner iniciar
# Usa gunicorn como um servidor WSGI mais robusto para produção
# O número de workers pode ser ajustado conforme necessário
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]

