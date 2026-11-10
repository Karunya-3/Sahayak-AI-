import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.prisma_service import prisma_service, SUPPORTED_PRISMA_LANGUAGES
from services.timbre_service import timbre_service, SUPPORTED_TIMBRE_LANGUAGES

logger = logging.getLogger("sahayak.routes.voice")
router = APIRouter(prefix="/api/voice", tags=["voice"])


class SpeakRequest(BaseModel):
    text: str
    language: Optional[str] = "hi-IN"
    voice: Optional[str] = None
    speed: Optional[float] = 1.0


@router.get("/languages")
async def get_supported_languages():
    """
    Returns available languages for Prisma STT and Timbre TTS.
    """
    return {
        "stt_languages": [
            {"code": code, "label": label}
            for code, label in SUPPORTED_PRISMA_LANGUAGES.items()
        ],
        "tts_languages": [
            {"code": code, "label": data["name"], "default_voice": data["default_voice"]}
            for code, data in SUPPORTED_TIMBRE_LANGUAGES.items()
        ],
    }


@router.post("/transcribe")
async def transcribe_speech(
    audio_file: UploadFile = File(...),
    language_code: str = Form("indic-auto"),
    format_type: str = Form("codemix"),
):
    """
    Transcribes spoken voice using Gnani Prisma Speech-to-Text.
    """
    try:
        content = await audio_file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file provided.")

        result = await prisma_service.transcribe_audio(
            audio_bytes=content,
            filename=audio_file.filename or "recording.wav",
            language_code=language_code,
            format_type=format_type,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /api/voice/transcribe")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speak")
async def speak_text(req: SpeakRequest):
    """
    Converts text to spoken audio using Gnani Timbre Text-to-Speech.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    result = await timbre_service.synthesize_speech(
        text=req.text,
        language=req.language or "hi-IN",
        voice=req.voice,
        speed=req.speed or 1.0,
    )
    return result
