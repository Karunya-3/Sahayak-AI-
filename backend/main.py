import logging
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from database.mongo import get_db, is_in_memory_mode
from services.prisma_service import prisma_service
from services.timbre_service import timbre_service
from services.evon_service import evon_service
from services.ocr_service import TESSERACT_AVAILABLE
from routes import voice, chat, documents, tasks

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("sahayak.main")

app = FastAPI(
    title="Sahayak AI API",
    description="Backend API for Sahayak AI – Multilingual Everyday Voice Assistant powered by Gnani.ai",
    version="1.0.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(voice.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(tasks.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Sahayak AI Backend...")
    try:
        get_db()
        mode = "In-Memory Resilient Store" if is_in_memory_mode() else "MongoDB Atlas Cluster"
        logger.info(f"Database initialized in mode: {mode}")
    except Exception as e:
        logger.error(f"Error on DB startup: {e}")

    logger.info(f"Gnani Prisma STT configured: {prisma_service.is_configured()}")
    logger.info(f"Gnani Timbre TTS configured: {timbre_service.is_configured()}")
    logger.info(f"Gnani Evon LLM configured: {evon_service.is_configured()}")
    logger.info(f"Tesseract OCR engine ready: {TESSERACT_AVAILABLE}")


@app.get("/")
async def root():
    return {
        "app": "Sahayak AI",
        "tagline": "Your everyday multilingual voice assistant",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    """
    Diagnostic healthcheck reporting status of AI models, database, and OCR engine.
    """
    return {
        "status": "healthy",
        "database": {
            "connected": True,
            "mode": "in_memory_mock" if is_in_memory_mode() else "mongodb_atlas",
            "db_name": settings.MONGODB_DB_NAME,
        },
        "gnani_services": {
            "prisma_stt": {
                "configured": prisma_service.is_configured(),
                "model": settings.GNANI_PRISMA_MODEL,
                "endpoint": settings.GNANI_PRISMA_URL,
            },
            "timbre_tts": {
                "configured": timbre_service.is_configured(),
                "model": settings.GNANI_TIMBRE_MODEL,
                "endpoint": settings.GNANI_TIMBRE_URL,
            },
            "evon_reasoning": {
                "configured": evon_service.is_configured(),
                "model": settings.GNANI_EVON_MODEL,
                "endpoint": settings.GNANI_EVON_URL,
            },
        },
        "ocr_engine": {
            "tesseract_available": TESSERACT_AVAILABLE,
            "pdf_selectable_extraction": True,
            "opencv_preprocessing": True,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
