# -*- coding: utf-8 -*-
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime, timezone

# 🔧 Instâncias globais de extensões
db = SQLAlchemy()
bcrypt = Bcrypt()

# 👤 Modelo de Usuário
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)

    # 🔗 Relação: um usuário → várias perspectivas
    perspectives = db.relationship(
        'Perspective',
        backref='author',
        lazy=True,
        cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        """Define a senha criptografada com bcrypt."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Verifica se a senha fornecida confere com o hash."""
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f'<User {self.email}>'

# 💬 Modelo de Perspectiva
class Perspective(db.Model):
    __tablename__ = 'perspectives'

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    response_md = db.Column(db.Text, nullable=True)  # Resposta da IA em Markdown
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self) -> str:
        return f'<Perspective {self.id} by User {self.user_id}>'
