from src import db, bcrypt # Import db e bcrypt do __init__
from datetime import datetime, timezone

class User(db.Model):
    __tablename__ = 'users' # Boa prática definir nome da tabela

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True) # Trocado para email, adicionado index
    password_hash = db.Column(db.String(256), nullable=False)
    perspectives = db.relationship('Perspective', backref='author', lazy=True, cascade="all, delete-orphan") # Adicionado cascade

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email}>' # Atualizado para email

class Perspective(db.Model):
    __tablename__ = 'perspectives'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True) # Adicionado index
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # Atualizado para users.id

    def __repr__(self):
        return f'<Perspective {self.title}>'

