from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    file_size: int
    extracted_text: str
    ocr_applied: bool
    page_count: int
    language_detected: Optional[str] = "en"
    upload_date: str


class DocumentUpdateRequest(BaseModel):
    extracted_text: str


class DocumentActionRequest(BaseModel):
    document_id: str
    user_id: Optional[str] = "default_user"
    action: str = Field(
        ...,
        description="summarize | explain_simple | translate | extract_dates | extract_amounts | extract_deadlines | ask_question",
    )
    question: Optional[str] = None
    target_language: Optional[str] = "hi-IN"
    generate_speech: Optional[bool] = False


class DocumentActionResponse(BaseModel):
    document_id: str
    action: str
    result_text: str
    structured_data: Optional[Dict[str, Any]] = None
    audio_base64: Optional[str] = None
