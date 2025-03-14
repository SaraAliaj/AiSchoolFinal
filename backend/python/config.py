import os
from dotenv import load_dotenv
from pathlib import Path

# Find .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    print(f"⚠️ Warning: .env file not found at {env_path}")

class Config:
    # Server configuration
    PORT = int(os.getenv("PORT", 8081))  # Changed default to 8081 to match frontend
    ENV = os.getenv("ENV", "development")
    
    # Database configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    DB_NAME = os.getenv("DB_NAME", "aischool")
    
    # API Keys
    XAI_API_KEY = os.getenv("XAI_API_KEY")
    if not XAI_API_KEY:
        print("❌ Error: XAI_API_KEY not found in environment variables")
    else:
        print(f"✅ XAI_API_KEY found: {XAI_API_KEY[:8]}...")
    
    # Frontend URL for development
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # CORS Settings - Updated to include all local development ports
    CORS_ORIGINS = [
        FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @classmethod
    def is_production(cls):
        return cls.ENV == "production"

    @classmethod
    def validate_config(cls):
        """Validate required configuration values"""
        is_valid = True
        
        if not cls.XAI_API_KEY:
            print("❌ Error: XAI_API_KEY is required but not set")
            is_valid = False
            
        if not cls.DB_HOST or not cls.DB_USER or not cls.DB_PASSWORD or not cls.DB_NAME:
            print("❌ Error: Database configuration is incomplete")
            is_valid = False
            
        return is_valid 