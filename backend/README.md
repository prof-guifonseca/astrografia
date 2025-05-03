# Astrografia API (Pós-Refatoração)

## Visão Geral

Este repositório contém o backend da aplicação Astrografia, uma API Flask projetada para fornecer cálculos astrológicos (posições planetárias, ascendente, casas) e um espaço para usuários autenticados registrarem e, futuramente, interpretarem suas perspectivas pessoais.

**Fases Anteriores:** Focaram na refatoração inicial, substituição da biblioteca de cálculo para `kerykeion`, implementação de autenticação JWT básica, armazenamento em memória e, posteriormente, persistência com SQLAlchemy e SQLite.

**Refatoração Atual (Concluída):** Esta fase focou em reestruturar o projeto para um padrão mais robusto, centralizando o código no diretório `src`, implementando configuração multiambiente, trocando a autenticação de `username` para `email`, integrando `Flask-Migrate` para gerenciamento do schema do banco de dados, adicionando caching (`lru_cache`) aos cálculos astrológicos, configurando CI/CD com GitHub Actions para testes e cobertura, e refinando a documentação.

**Observação Importante (Banco de Dados):** O backend agora utiliza `Flask-Migrate` para gerenciar o schema. O ambiente de desenvolvimento padrão usa SQLite (`astrografia_dev.db`). Para produção, configure a variável de ambiente `DATABASE_URL` para um banco de dados como PostgreSQL.

## Funcionalidades Principais (Pós-Refatoração)

*   **Cálculo Astrológico:** Endpoint `/api/astro/positions` que retorna as posições dos planetas, ascendente e casas, com caching LRU implementado. **Requer** data, hora, latitude, longitude e timezone (formato IANA) como parâmetros explícitos.
*   **Autenticação:** Sistema de registro e login de usuários com `email` e senha, usando JWT (`/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`), com dados armazenados em banco de dados gerenciado por `Flask-Migrate`.
*   **Perspectivas Pessoais:** Endpoints protegidos (`/api/perspectives`) para usuários autenticados adicionarem (POST) e listarem (GET) suas perspectivas, armazenadas em banco de dados.
*   **Interpretação (Placeholder):** Endpoint protegido `/api/interpret/perspective/<int:perspective_id>`.
*   **Banco de Dados:** Utiliza Flask-SQLAlchemy com modelos `User` (com `email`) e `Perspective`. Migrações gerenciadas por `Flask-Migrate`.
*   **Testes Automatizados:** Suíte de testes com PyTest e `pytest-cov` cobrindo os fluxos principais (`/backend/tests/`).
*   **CI/CD:** Workflow de GitHub Actions (`.github/workflows/ci.yml`) que executa testes e verifica cobertura mínima de 90% em push/pull requests para `main`/`master`.
*   **Segurança:**
    *   Hashing de senhas com Bcrypt.
    *   Proteção de rotas com `@jwt_required()`.
    *   Configuração de CORS parametrizável via `CORS_ORIGINS`.
    *   Uso de variáveis de ambiente (`.env`) para `JWT_SECRET_KEY`, `DATABASE_URL`, etc.
    *   Pre-commit hook para prevenir o commit de arquivos `.env`.
*   **DevOps:**
    *   `Dockerfile` e `docker-compose.yml` para conteinerização.
    *   `requirements.txt` atualizado.
    *   Estrutura de projeto organizada em `src/`.

## Setup e Instalação

1.  **Clonar o Repositório:**
    ```bash
    git clone https://github.com/prof-guifonseca/astrografia.git
    cd astrografia
    ```

2.  **Configurar Ambiente Virtual (Backend):**
    ```bash
    cd backend
    python3.11 -m venv venv
    source venv/bin/activate
    ```

3.  **Instalar Dependências:**
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```

4.  **Configurar Variáveis de Ambiente:**
    *   Copie `.env.example` para `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Edite `.env` e defina `JWT_SECRET_KEY`. Para usar SQLite (padrão dev), `DATABASE_URL` pode ser omitido ou definido como `sqlite:///astrografia_dev.db`. Para PostgreSQL, use o formato `postgresql://user:password@host:port/dbname`.
        ```dotenv
        # backend/.env
        FLASK_ENV=development # Ou production, testing
        JWT_SECRET_KEY=sua_chave_secreta_super_segura_aqui
        DATABASE_URL=sqlite:///astrografia_dev.db # Padrão para desenvolvimento
        # DATABASE_URL=postgresql://user:password@host:port/dbname # Exemplo PostgreSQL
        # CORS_ORIGINS=http://localhost:3000,https://seu-frontend.com
        ```
    *   **Importante:** Nunca comite o arquivo `.env`.

5.  **Aplicar Migrações do Banco de Dados:**
    Com o ambiente virtual ativado no diretório `backend/`:
    ```bash
    # Define o app Flask e adiciona o diretório raiz ao PYTHONPATH
    export FLASK_APP=app.py
    export PYTHONPATH=.
    # Aplica as migrações para criar/atualizar as tabelas
    flask db upgrade
    ```
    Isso criará o arquivo `astrografia_dev.db` (se usando SQLite e não existir) e aplicará as migrações definidas em `backend/migrations/`.

6.  **Instalar Pre-commit Hooks (Recomendado):**
    No diretório raiz (`astrografia/`):
    ```bash
    # Se instalou no venv do backend:
    backend/venv/bin/pre-commit install
    ```

## Executando Localmente

### 1. Usando o Servidor de Desenvolvimento Flask:

   No diretório `backend/` com o ambiente virtual ativado:
   ```bash
   source venv/bin/activate
   # Certifique-se que as migrações foram aplicadas com 'flask db upgrade'
   export FLASK_APP=app.py
   export PYTHONPATH=.
   flask run --host=0.0.0.0 --port=5000
   ```

### 2. Usando Docker Compose:

   No diretório raiz (`astrografia/`):
   ```bash
   # Certifique-se de que o backend/.env está configurado
   # O Docker Compose montará o diretório atual.
   # As migrações precisam ser aplicadas. Você pode fazer isso antes ou depois do 'up'.
   
   # Opção 1: Aplicar migrações localmente antes
   # (cd backend && source venv/bin/activate && export FLASK_APP=app.py && export PYTHONPATH=. && flask db upgrade)
   
   docker-compose up --build
   
   # Opção 2: Aplicar migrações dentro do container (após 'up')
   # docker-compose exec backend bash -c "export FLASK_APP=app.py && export PYTHONPATH=. && flask db upgrade"
   ```
   A API estará acessível em `http://localhost:5000`.

## Executando Testes

Com o ambiente virtual ativado no diretório `backend/` e as dependências (incluindo `pytest`, `pytest-cov`) instaladas:
```bash
# Define PYTHONPATH para incluir o diretório raiz onde src está
export PYTHONPATH=.
# Executa pytest com cobertura, reportando arquivos sem cobertura
pytest --cov=src --cov-report=term-missing

# Para verificar a cobertura mínima (usado no CI):
# pytest --cov=src --cov-fail-under=90 
```
O workflow de CI configurado em `.github/workflows/ci.yml` executa esses testes automaticamente e falha se a cobertura for inferior a 90%.

## Endpoints da API (Pós-Refatoração)

*   `GET /`: Rota raiz, retorna uma mensagem de status.
*   `POST /api/auth/register`: Registra um novo usuário (DB).
    *   **Body:** `{"email": "newuser@example.com", "password": "secret"}`
    *   **Resposta:** `{"msg": "Usuário registrado com sucesso"}` (201)
*   `POST /api/auth/login`: Autentica um usuário (DB) e retorna tokens JWT.
    *   **Body:** `{"email": "test@example.com", "password": "secret"}`
    *   **Resposta:** `{"access_token": "...", "refresh_token": "..."}` (200)
*   `POST /api/auth/refresh`: Gera um novo access token.
    *   **Header:** `Authorization: Bearer <refresh_token>`
    *   **Resposta:** `{"access_token": "..."}` (200)
*   `GET /api/auth/protected`: Rota de exemplo protegida.
    *   **Header:** `Authorization: Bearer <access_token>`
    *   **Resposta:** `{"logged_in_as": "test@example.com", "user_id": 1}` (200)
*   `POST /api/perspectives`: Adiciona uma nova perspectiva (DB).
    *   **Header:** `Authorization: Bearer <access_token>`
    *   **Body:** `{"title": "Título da Perspectiva", "content": "Conteúdo..."}`
    *   **Resposta:** `{"msg": "Perspectiva adicionada...", "perspective": {...}}` (201)
*   `GET /api/perspectives`: Lista as perspectivas do usuário (DB).
    *   **Header:** `Authorization: Bearer <access_token>`
    *   **Resposta:** `{"perspectives": [{...}, {...}]}` (200)
*   `GET /api/interpret/perspective/<int:perspective_id>`: Retorna interpretação placeholder.
    *   **Header:** `Authorization: Bearer <access_token>`
    *   **Resposta:** `{"perspective_id": ..., "perspective_title": ..., "interpretation": "...em desenvolvimento..."}` (200)
*   `GET /api/astro/positions`: Calcula as posições astrológicas (com cache).
    *   **Query Params Obrigatórios:** `date` (YYYY-MM-DD), `time` (HH:MM), `lat` (float), `lon` (float), `tz` (string IANA).
    *   **Query Param Opcional:** `city` (string).
    *   **Resposta:** JSON com `planets`, `ascendant`, `houses` (200) ou erro (400/500).

## Fluxos Principais (Diagramas Mermaid)

(Os diagramas anteriores para Autenticação e Posições são conceitualmente semelhantes, mas agora a API interage com o `Database` gerenciado por `Flask-Migrate` e usa `email` para autenticação. O fluxo de Perspectivas continua usando `Database`.)

**Fluxo de Autenticação (com Email e DB):**
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Database

    User->>API: POST /api/auth/register (Body: {email, password})
    API->>Database: SELECT id FROM users WHERE email = ?
    alt Email Não Existe
        API->>API: Hash Password (bcrypt)
        API->>Database: INSERT INTO users (email, password_hash)
        Database-->>API: Sucesso
        API-->>User: 201 Created {msg: "Usuário registrado..."}
    else Email Já Existe
        API-->>User: 409 Conflict {msg: "Email já cadastrado"}
    end

    User->>API: POST /api/auth/login (Body: {email, password})
    API->>Database: SELECT id, password_hash FROM users WHERE email = ?
    alt Usuário Encontrado
        API->>API: Verificar Senha (bcrypt.check_password_hash)
        alt Senha Correta
            API->>API: Gerar Access & Refresh Tokens (JWT)
            API-->>User: 200 OK {access_token: "...", refresh_token: "..."}
        else Senha Incorreta
            API-->>User: 401 Unauthorized {msg: "Credenciais inválidas"}
        end
    else Usuário Não Encontrado
        API-->>User: 401 Unauthorized {msg: "Credenciais inválidas"}
    end
```

## Deploy (Exemplo com Render)

O deploy com Docker no Render continua similar:

1.  Conecte seu repositório Git.
2.  Crie um novo Web Service (Docker).
3.  **Variáveis de Ambiente:** Configure `FLASK_ENV=production`, `JWT_SECRET_KEY`. Se usar PostgreSQL no Render, configure `DATABASE_URL` com as credenciais fornecidas. Se usar SQLite, o arquivo será criado no disco efêmero (não persistirá sem um disco persistente).
4.  **Comando de Build:** O Dockerfile já copia o código e instala dependências.
5.  **Comando de Start:** Render geralmente detecta o `CMD` no Dockerfile (`gunicorn --bind 0.0.0.0:5000 app:app`).
6.  **Migrações:** Adicione um comando no Render para executar as migrações após o build/deploy: `export FLASK_APP=app.py && export PYTHONPATH=. && flask db upgrade`.
7.  **Plano:** Escolha um plano.
8.  Deploy.

## Limitações e Próximos Passos Sugeridos

*   **Interpretação:** Implementar a lógica real no endpoint `/api/interpret`.
*   **Dados de Nascimento:** Adicionar campos de data/hora/local de nascimento ao modelo `User`.
*   **Banco de Dados:** Avaliar PostgreSQL para produção.
*   **Testes:** Manter e expandir a suíte de testes.
*   **Frontend:** Desenvolver a interface.
*   **Geocoding:** Se necessário, implementar no frontend ou backend.
*   **Monitoramento e Logging:** Implementar para produção.
*   **Segurança Adicional:** Considerar rate limiting, validação de entrada mais granular, etc.

## Contribuição

Pull requests são bem-vindos. Abra uma issue para discutir mudanças maiores.

