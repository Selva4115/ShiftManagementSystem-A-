import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production-123456')
    
    # SQLAlchemy configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'mysql+pymysql://root:rootpassword@localhost:3306/shift_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production-123456')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    
    # Mail configurations
    MAIL_SERVER = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('SMTP_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('SMTP_USER', '')
    MAIL_PASSWORD = os.environ.get('SMTP_PASS', '')
    MAIL_DEFAULT_SENDER = os.environ.get('SMTP_USER', '')
