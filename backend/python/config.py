import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server configuration
    PORT = int(os.getenv("PORT", 8000))
    ENV = os.getenv("ENV", "development")
    
    # Database configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "aischool")
    
    # API Keys
    XAI_API_KEY = os.getenv("XAI_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # CORS Settings
    CORS_ORIGINS = [
        "https://your-frontend-app.onrender.com",  # Update this with your frontend URL
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    @classmethod
    def is_production(cls):
        return cls.ENV == "production" 