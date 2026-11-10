from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message_id: Optional[str] = None
    role: str = Field(..., description="user or assistant")
    content: str
    audio_url: Optional[str] = None
    language: Optional[str] = "hi-IN"
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = "default_user"
    message: str
    language: Optional[str] = "hi-IN"
    generate_speech: Optional[bool] = False
    context_type: Optional[str] = "general"  # general, document, task, translation
    document_context: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    user_id: str
    user_message: ChatMessage
    assistant_message: ChatMessage
    audio_base64: Optional[str] = None
    extracted_action: Optional[Dict[str, Any]] = None


class TranslationRequest(BaseModel):
    text: str
    target_language: str
    source_language: Optional[str] = "auto"
    tone: Optional[str] = "natural"  # polite, formal, simple, casual


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    target_language: str
    tone: str
    audio_base64: Optional[str] = None
