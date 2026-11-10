import logging
import httpx
from typing import Dict, Any, Optional
from config import settings

logger = logging.getLogger("sahayak.services.prisma")

# Supported language codes for Gnani Prisma STT
SUPPORTED_PRISMA_LANGUAGES = {
    "indic-auto": "Auto-Detect Indic Language",
    "hi-IN": "Hindi (हिन्दी)",
    "te-IN": "Telugu (తెలుగు)",
    "ta-IN": "Tamil (தமிழ்)",
    "kn-IN": "Kannada (ಕನ್ನಡ)",
    "en-IN": "Indian English",
    "mr-IN": "Marathi (मराठी)",
    "gu-IN": "Gujarati (ગુજરાતી)",
    "bn-IN": "Bengali (বাংলা)",
    "ml-IN": "Malayalam (മലയാളം)",
    "pa-IN": "Punjabi (ਪੰਜਾਬੀ)",
}


class PrismaService:
    """
    Gnani.ai Prisma Speech-to-Text service integration.
    Interacts with the official Gnani STT API (v3.0).
    """

    def __init__(self):
        self.api_url = settings.GNANI_PRISMA_URL
        self.api_key = settings.GNANI_API_KEY
        self.model = settings.GNANI_PRISMA_MODEL

    def is_configured(self) -> bool:
        return bool(self.api_key and "YOUR_" not in self.api_key and len(self.api_key.strip()) > 5)

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "recording.wav",
        language_code: str = "indic-auto",
        format_type: str = "codemix",
    ) -> Dict[str, Any]:
        """
        Transcribes speech audio using Gnani Prisma v3.0 REST endpoint.
        """
        if not audio_bytes or len(audio_bytes) < 100:
            return {
                "success": False,
                "error": "Audio file is too short or empty.",
                "transcript": "",
            }

        # Normalize language_code if needed
        if language_code not in SUPPORTED_PRISMA_LANGUAGES:
            language_code = "indic-auto"

        # Detect audio container from magic bytes to prevent ffmpeg RIFF header mismatch
        detected_filename = filename
        detected_content_type = "audio/wav"

        if audio_bytes.startswith(b"RIFF") and len(audio_bytes) > 12 and audio_bytes[8:12] == b"WAVE":
            detected_filename = "recording.wav"
            detected_content_type = "audio/wav"
        elif audio_bytes.startswith(b"\x1a\x45\xdf\xa3"):
            detected_filename = "recording.webm"
            detected_content_type = "audio/webm"
        elif audio_bytes.startswith(b"OggS"):
            detected_filename = "recording.ogg"
            detected_content_type = "audio/ogg"
        elif audio_bytes.startswith(b"ID3") or (len(audio_bytes) > 2 and audio_bytes[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")):
            detected_filename = "recording.mp3"
            detected_content_type = "audio/mp3"
        elif filename.endswith(".wav"):
            detected_filename = "recording.wav"
            detected_content_type = "audio/wav"
        elif filename.endswith(".webm"):
            detected_filename = "recording.webm"
            detected_content_type = "audio/webm"

        logger.info(
            f"Detected audio payload: {detected_filename} ({detected_content_type}, {len(audio_bytes)} bytes). "
            f"Sending to Gnani Prisma at {self.api_url}..."
        )

        headers = {
            "X-API-Key-ID": self.api_key,
        }

        files = {
            "audio_file": (detected_filename, audio_bytes, detected_content_type),
        }

        data = {
            "model": self.model,
            "language_code": language_code,
            "format": format_type,
        }

        # If API key is not configured, inform clearly
        if not self.is_configured():
            logger.warning("Gnani API key is not configured or placeholder. Returning placeholder notice.")
            return {
                "success": False,
                "error": "GNANI_API_KEY is not configured in backend/.env. Please enter your Gnani API key to enable live Prisma STT.",
                "transcript": "",
                "is_mock": True,
            }

        try:
            logger.info(f"Sending audio ({len(audio_bytes)} bytes) to Gnani Prisma at {self.api_url}...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    files=files,
                    data=data,
                )

            if response.status_code == 200:
                result = response.json()
                transcript = (
                    result.get("transcript")
                    or result.get("data", {}).get("transcript")
                    or result.get("text")
                    or ""
                )
                detected_lang = (
                    result.get("detected_language_code")
                    or result.get("data", {}).get("language_code")
                    or language_code
                )
                logger.info(f"Prisma transcription succeeded: {transcript[:50]}...")
                return {
                    "success": True,
                    "transcript": transcript.strip(),
                    "detected_language_code": detected_lang,
                    "model": result.get("model", self.model),
                    "processing_time": result.get("processing_time"),
                    "raw": result,
                }
            else:
                err_msg = f"Gnani Prisma API returned HTTP {response.status_code}: {response.text}"
                logger.error(err_msg)
                return {
                    "success": False,
                    "error": err_msg,
                    "transcript": "",
                    "status_code": response.status_code,
                }

        except httpx.RequestError as e:
            err_msg = f"Network error connecting to Gnani Prisma STT: {str(e)}"
            logger.error(err_msg)
            return {
                "success": False,
                "error": err_msg,
                "transcript": "",
            }
        except Exception as e:
            logger.exception("Unexpected error in Prisma STT transcription")
            return {
                "success": False,
                "error": str(e),
                "transcript": "",
            }


prisma_service = PrismaService()
