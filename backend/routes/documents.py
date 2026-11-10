import logging
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.document import (
    DocumentUploadResponse,
    DocumentUpdateRequest,
    DocumentActionRequest,
    DocumentActionResponse,
)
from services.document_service import document_service
from services.evon_service import evon_service
from services.timbre_service import timbre_service
from database.mongo import (
    save_document,
    get_document,
    list_documents,
    update_document_text,
    delete_document,
)
from config import settings

logger = logging.getLogger("sahayak.routes.documents")
router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form("default_user"),
):
    """
    Accepts PDF or Image upload, applies PyMuPDF extraction / OpenCV + Tesseract OCR,
    and returns editable text.
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # File size limit (15MB)
        if len(content) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds maximum 15MB limit.")

        filename = file.filename or "uploaded_doc"
        # Save file to disk
        doc_id = str(uuid.uuid4())
        disk_filename = f"{doc_id}_{filename}"
        disk_path = settings.UPLOAD_DIR / disk_filename
        with open(disk_path, "wb") as f:
            f.write(content)

        # Process text extraction
        processed = document_service.process_uploaded_file(content, filename)

        doc_record = {
            "document_id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "file_type": processed.get("file_type", "unknown"),
            "file_size": processed.get("file_size", len(content)),
            "disk_path": str(disk_path),
            "extracted_text": processed.get("extracted_text", ""),
            "ocr_applied": processed.get("ocr_applied", False),
            "page_count": processed.get("page_count", 1),
            "status": processed.get("status", "ready"),
        }

        saved_doc = save_document(doc_record)

        return DocumentUploadResponse(
            document_id=saved_doc["document_id"],
            filename=saved_doc["filename"],
            file_type=saved_doc["file_type"],
            file_size=saved_doc["file_size"],
            extracted_text=saved_doc["extracted_text"],
            ocr_applied=saved_doc["ocr_applied"],
            page_count=saved_doc["page_count"],
            upload_date=saved_doc["upload_date"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /api/documents/upload")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_all_documents(user_id: str = "default_user"):
    """
    Lists uploaded documents for the user.
    """
    return list_documents(user_id=user_id)


@router.get("/{document_id}")
async def get_single_document(document_id: str, user_id: str = "default_user"):
    """
    Fetches full document text and metadata.
    """
    doc = get_document(document_id, user_id=user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.put("/{document_id}/text")
async def update_extracted_text(
    document_id: str,
    req: DocumentUpdateRequest,
    user_id: str = "default_user",
):
    """
    Allows user to edit and correct OCR mistakes before analysis.
    """
    success = update_document_text(document_id, user_id, req.extracted_text)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or update failed.")
    return {"success": True, "document_id": document_id}


@router.post("/action", response_model=DocumentActionResponse)
async def perform_document_action(req: DocumentActionRequest, user_id: str = "default_user"):
    """
    Analyzes document text based on requested action:
    summarize, explain_simple, translate, extract_dates, extract_amounts, extract_deadlines, ask_question.
    """
    effective_user_id = req.user_id or user_id
    doc = get_document(req.document_id, user_id=effective_user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc_text = doc.get("extracted_text", "")
    if not doc_text or not doc_text.strip():
        raise HTTPException(status_code=400, detail="Document does not contain any extracted text.")

    analysis = await evon_service.analyze_document(
        document_text=doc_text,
        action=req.action,
        question=req.question,
        target_language=req.target_language or "hi-IN",
    )

    audio_b64 = None
    if req.generate_speech and analysis.get("result_text"):
        tts = await timbre_service.synthesize_speech(
            text=analysis["result_text"][:350],
            language=req.target_language or "hi-IN",
        )
        if tts.get("success"):
            audio_b64 = tts.get("audio_base64")

    return DocumentActionResponse(
        document_id=req.document_id,
        action=req.action,
        result_text=analysis["result_text"],
        structured_data=analysis.get("structured_data"),
        audio_base64=audio_b64,
    )


@router.delete("/{document_id}")
async def remove_document(document_id: str, user_id: str = "default_user"):
    """
    Deletes document record and local file.
    """
    doc = get_document(document_id, user_id=user_id)
    if doc and doc.get("disk_path") and os.path.exists(doc["disk_path"]):
        try:
            os.remove(doc["disk_path"])
        except Exception:
            pass
    success = delete_document(document_id, user_id=user_id)
    return {"success": success, "document_id": document_id}
