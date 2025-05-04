# -*- coding: utf-8 -*-

import os
from datetime import timedelta, datetime, timezone
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# 🔧 Instâncias globais de extensões
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
jwt = JWTManager()

# 📦 Importações ajustadas com base na nova estrutura
from app.auth import auth_bp
from app.perspectives import perspectives_bp
from app.interpret import interpret_bp
from app.astro_utils import astro_bp

# 🔐 Variáveis do .env (em dev)
if os.environ.get("FLASK_ENV") != "production":
    from dotenv import load_dotenv
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(dotenv_path=dotenv_path)

# ♻️ Configurações
class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "default-secret-key")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "default-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///astrografia_dev.db")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    WTF_CSRF_ENABLED = False
    CORS_ORIGINS = "*"

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL não definida para produção.")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "")
    if not CORS_ORIGINS or CORS_ORIGINS.strip() == "*":
        print("⚠️ AVISO: CORS_ORIGINS não está restrito. Configure origens seguras para produção!")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

# 👤 Modelo de Usuário
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)

    perspectives = db.relationship(
        'Perspective',
        backref='author',
        lazy=True,
        cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f'<User {self.email}>'

# 💬 Modelo de Perspectiva
class Perspective(db.Model):
    __tablename__ = 'perspectives'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    response_md = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self) -> str:
        return f'<Perspective {self.id} by User {self.user_id}>'

# 🚀 Factory principal
def create_app(config_name=None):
    config_name = config_name or os.getenv("FLASK_ENV", "default")
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        CORS(app)
    else:
        origins = [origin.strip() for origin in cors_origins.split(",")]
        CORS(app, resources={r"/api/*": {"origins": origins}})

    # 🧩 Registro direto dos blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(perspectives_bp, url_prefix="/api/perspectives")
    app.register_blueprint(interpret_bp, url_prefix="/api/interpret")
    app.register_blueprint(astro_bp, url_prefix="/api/astro")

    @app.cli.command("create-all-tables")
    def create_all_tables():
        with app.app_context():
            print("📦 Criando todas as tabelas do banco de dados...")
            db.create_all()
            print("✅ Tabelas criadas com sucesso.")

    @app.route("/")
    def home():
        return "🌌 Astrografia API está no ar!"

    return app

# ⏯️ Inicializa o app
app = create_app()
