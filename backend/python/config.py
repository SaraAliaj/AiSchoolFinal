import os
from dotenv import load_dotenv
from pathlib import Path

# Find .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment variables from {env_path}")
else:
    print(f"⚠️ Warning: .env file not found at {env_path}")

class Config:
    # Server configuration
    PORT = int(os.getenv("PORT", 8081))  # Changed default to 8081 to match frontend
    ENV = os.getenv("ENV", "development")
    IS_PRODUCTION = ENV.lower() == "production" or os.getenv("RENDER", "") == "true"
    
    # Database configuration
    DB_HOST = os.getenv("DB_HOST")
    if not DB_HOST:
        if IS_PRODUCTION:
            # In production, if DB_HOST isn't set, use the render database URL with full domain
            DB_HOST = "quiz-database-8ags.onrender.com"
            print(f"⚠️ DB_HOST not set, defaulting to production DB: {DB_HOST}")
        else:
            DB_HOST = "localhost"
            print(f"⚠️ DB_HOST not set, defaulting to: {DB_HOST}")
            
    DB_USER = os.getenv("DB_USER", "Sara")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Sara0330!!")
    DB_NAME = os.getenv("DB_NAME", "aischool")
    
    # API Keys
    XAI_API_KEY = os.getenv("XAI_API_KEY")
    if not XAI_API_KEY:
        print("❌ Error: XAI_API_KEY not found in environment variables")
    else:
        print(f"✅ XAI_API_KEY found: {XAI_API_KEY[:8]}...")
    
    # Frontend URL for development or production
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # CORS Settings - Updated to include all local development ports and production URLs
    CORS_ORIGINS = [
        FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://aiacademia.tech",
        "https://quiz-frontend.onrender.com"
    ]

    @classmethod
    def is_production(cls):
        return cls.IS_PRODUCTION

    @classmethod
    def get_db_config(cls):
        """Get database configuration with proper handling for production"""
        config = {
            'host': cls.DB_HOST,
            'user': cls.DB_USER,
            'password': cls.DB_PASSWORD,
            'database': cls.DB_NAME
        }
        
        # Add SSL settings for production
        if cls.is_production():
            config['ssl_disabled'] = False
            config['ssl'] = {'rejectUnauthorized': False}
            
        return config

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

# Print configuration details on import
print(f"🌐 Environment: {Config.ENV} (Production: {Config.is_production()})")
print(f"🛢️ Database: {Config.DB_HOST}:{Config.DB_NAME} (User: {Config.DB_USER})")
print(f"🌐 Frontend URL: {Config.FRONTEND_URL}") 