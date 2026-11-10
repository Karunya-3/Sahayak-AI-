import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Locate .env in the backend folder
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()


class Settings(BaseSettings):
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # MongoDB Atlas Connection
    MONGODB_URI: str = os.getenv(
        "MONGODB_URI",
        "mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.mongodb.net/sahayak_ai?retryWrites=true&w=majority",
    )
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "sahayak_ai")

    # Gnani.ai AI Keys & Endpoints
    GNANI_API_KEY: str = os.getenv("GNANI_API_KEY", "YOUR_GNANI_API_KEY_HERE")
    
    # Prisma STT
    GNANI_PRISMA_URL: str = os.getenv("GNANI_PRISMA_URL", "https://api.vachana.ai/stt/v3")
    GNANI_PRISMA_MODEL: str = os.getenv("GNANI_PRISMA_MODEL", "prisma-v3.0")
    
    # Timbre TTS
    GNANI_TIMBRE_URL: str = os.getenv("GNANI_TIMBRE_URL", "https://api.vachana.ai/api/v1/tts/inference")
    GNANI_TIMBRE_MODEL: str = os.getenv("GNANI_TIMBRE_MODEL", "timbre-v2.5")
    GNANI_TIMBRE_DEFAULT_VOICE: str = os.getenv("GNANI_TIMBRE_DEFAULT_VOICE", "Nalini")

    # Evon LLM
    GNANI_EVON_URL: str = os.getenv("GNANI_EVON_URL", "https://api.vachana.ai/v1/chat/completions")
    GNANI_EVON_MODEL: str = os.getenv("GNANI_EVON_MODEL", "gnani/gnani-evon-v3.3-30B-A3B")

    # OCR
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "")

    # Storage paths
    UPLOAD_DIR: Path = BASE_DIR / "uploads"

    class Config:
        case_sensitive = True


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
