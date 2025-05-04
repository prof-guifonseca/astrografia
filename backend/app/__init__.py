# -*- coding: utf-8 -*-
import os
from datetime import datetime, timezone
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from app.config import config_by_name

# 🔧 Instâncias globais de extensões
db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
jwt = JWTManager()

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

    from app.routes.auth import auth_bp
    from app.routes.perspectives import perspectives_bp
    from app.routes.astro import astro_bp
    from app.routes.interpret import interpret_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(perspectives_bp, url_prefix="/api/perspectives")
    app.register_blueprint(astro_bp, url_prefix="/api/astro")
    app.register_blueprint(interpret_bp, url_prefix="/api/interpret")

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
