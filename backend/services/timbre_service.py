import base64
import logging
import io
import httpx
from typing import Dict, Any, Optional
from config import settings

logger = logging.getLogger("sahayak.services.timbre")

SUPPORTED_TIMBRE_LANGUAGES = {
    "hi-IN": {"name": "Hindi", "default_voice": "Nalini"},
    "te-IN": {"name": "Telugu", "default_voice": "Chitra"},
    "ta-IN": {"name": "Tamil", "default_voice": "Vani"},
    "kn-IN": {"name": "Kannada", "default_voice": "Kavya"},
    "en-IN": {"name": "English (India)", "default_voice": "Nalini"},
    "mr-IN": {"name": "Marathi", "default_voice": "Aarohi"},
    "gu-IN": {"name": "Gujarati", "default_voice": "Diya"},
    "bn-IN": {"name": "Bengali", "default_voice": "Ananya"},
    "ml-IN": {"name": "Malayalam", "default_voice": "Maya"},
    "pa-IN": {"name": "Punjabi", "default_voice": "Simran"},
}


class TimbreService:
    """
    Gnani.ai Timbre Text-to-Speech service integration.
    Synthesizes natural speech across Indian languages using Gnani Timbre models.
    """

    def __init__(self):
        self.api_url = settings.GNANI_TIMBRE_URL
        self.api_key = settings.GNANI_API_KEY
        self.model = settings.GNANI_TIMBRE_MODEL
        self.default_voice = settings.GNANI_TIMBRE_DEFAULT_VOICE

    def is_configured(self) -> bool:
        return bool(self.api_key and "YOUR_" not in self.api_key and len(self.api_key.strip()) > 5)

    async def synthesize_speech(
        self,
        text: str,
        language: str = "hi-IN",
        voice: Optional[str] = None,
        speed: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Synthesizes speech from text using Gnani Timbre TTS REST API.
        Returns audio as base64 encoded wav and raw bytes.
        """
        if not text or not text.strip():
            return {"success": False, "error": "Text cannot be empty"}

        clean_text = text.strip()
        lang_info = SUPPORTED_TIMBRE_LANGUAGES.get(language, SUPPORTED_TIMBRE_LANGUAGES["hi-IN"])
        selected_voice = voice or lang_info.get("default_voice", self.default_voice)

        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "text": clean_text,
            "voice": selected_voice,
            "model": self.model,
            "language": language,
            "speed": max(0.7, min(1.3, speed)),
            "audio_config": {
                "encoding": "linear_pcm",
                "container": "wav",
                "num_channels": 1,
                "sample_rate": 24000,
                "sample_width": 2,
            },
        }

        # If Gnani API key is not configured, fallback gracefully using gTTS (if available)
        if not self.is_configured():
            logger.info("Gnani API key placeholder detected. Using secondary TTS fallback for preview.")
            return self._fallback_tts(clean_text, language)

        try:
            logger.info(f"Synthesizing speech via Gnani Timbre ({language}, {selected_voice})...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                )

            if response.status_code == 200:
                audio_bytes = response.content
                # If JSON returned with base64 audio
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    res_json = response.json()
                    b64 = res_json.get("audio_content") or res_json.get("data") or res_json.get("audio")
                    if b64:
                        return {
                            "success": True,
                            "audio_base64": f"data:audio/wav;base64,{b64}",
                            "format": "wav",
                            "model": self.model,
                            "provider": "gnani_timbre",
                        }

                # Otherwise binary audio
                b64_str = base64.b64encode(audio_bytes).decode("utf-8")
                return {
                    "success": True,
                    "audio_base64": f"data:audio/wav;base64,{b64_str}",
                    "format": "wav",
                    "model": self.model,
                    "provider": "gnani_timbre",
                }
            else:
                logger.error(f"Gnani Timbre API error {response.status_code}: {response.text}")
                # Fallback on API failure
                fallback = self._fallback_tts(clean_text, language)
                fallback["gnani_error"] = f"HTTP {response.status_code}: {response.text[:100]}"
                return fallback

        except Exception as e:
            logger.exception("Error in Gnani Timbre TTS")
            fallback = self._fallback_tts(clean_text, language)
            fallback["gnani_error"] = str(e)
            return fallback

    def _fallback_tts(self, text: str, language: str) -> Dict[str, Any]:
        """
        Resilient secondary TTS using gTTS when Gnani API key is not yet set.
        """
        try:
            from gtts import gTTS
            lang_code = language.split("-")[0] if "-" in language else language
            # gTTS supports hi, te, ta, kn, mr, bn, gu, ml, en
            tts = gTTS(text=text[:300], lang=lang_code, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            b64_str = base64.b64encode(fp.read()).decode("utf-8")
            return {
                "success": True,
                "audio_base64": f"data:audio/mp3;base64,{b64_str}",
                "format": "mp3",
                "model": "tts-fallback",
                "provider": "local_fallback",
                "notice": "Rendered using local TTS fallback. Add GNANI_API_KEY to activate authentic Timbre v2.5 voice.",
            }
        except Exception as e:
            logger.warning(f"Fallback TTS failed: {e}")
            return {
                "success": False,
                "error": "TTS audio synthesis unavailable without GNANI_API_KEY.",
            }


timbre_service = TimbreService()
