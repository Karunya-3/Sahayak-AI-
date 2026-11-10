import io
import logging
from typing import Dict, Any, Tuple
import pymupdf as fitz
from services.ocr_service import ocr_service
from services.evon_service import evon_service
from config import settings

logger = logging.getLogger("sahayak.services.document")


class DocumentService:
    """
    Handles PDF text extraction via PyMuPDF and orchestrates OCR for scanned PDFs & images.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}

    def process_uploaded_file(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Processes uploaded document file (PDF or Image).
        Extracts selectable text via PyMuPDF or runs OCR on images/scanned pages.
        """
        ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
        file_size = len(file_bytes)

        if ext == ".pdf":
            return self._process_pdf(file_bytes, filename, file_size)
        elif ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}:
            return self._process_image(file_bytes, filename, file_size)
        else:
            # Fallback text decoding
            try:
                text = file_bytes.decode("utf-8", errors="replace")
                return {
                    "filename": filename,
                    "file_type": ext or "text",
                    "file_size": file_size,
                    "extracted_text": text,
                    "ocr_applied": False,
                    "page_count": 1,
                    "status": "ready",
                }
            except Exception as e:
                return {
                    "filename": filename,
                    "file_type": ext,
                    "file_size": file_size,
                    "extracted_text": "",
                    "ocr_applied": False,
                    "page_count": 0,
                    "status": "error",
                    "error": f"Unsupported file format: {ext}",
                }

    def _process_pdf(self, file_bytes: bytes, filename: str, file_size: int) -> Dict[str, Any]:
        """
        Uses PyMuPDF to extract text from PDF.
        If pages have no selectable text (scanned PDF), renders them to images and runs OCR.
        """
        extracted_text_blocks = []
        page_count = 0
        ocr_applied = False
        ocr_notes = []

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)

            for page_index in range(page_count):
                page = doc[page_index]
                text = page.get_text("text").strip()

                # If page has sufficient selectable text, use PyMuPDF direct extraction
                if len(text) > 30:
                    extracted_text_blocks.append(f"--- Page {page_index + 1} ---\n{text}")
                else:
                    # Page is likely scanned / image-based
                    logger.info(f"Page {page_index + 1} has little/no text ({len(text)} chars). Running OCR...")
                    # Render page to high-res image (2.0 zoom for crisp OCR)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                    img_bytes = pix.tobytes("png")
                    ocr_res = ocr_service.extract_text_from_image(img_bytes)

                    ocr_applied = True
                    page_text = ocr_res.get("extracted_text", "").strip()
                    if page_text:
                        extracted_text_blocks.append(f"--- Page {page_index + 1} (OCR) ---\n{page_text}")
                    if "notice" in ocr_res:
                        ocr_notes.append(ocr_res["notice"])

            full_text = "\n\n".join(extracted_text_blocks).strip()
            if not full_text:
                full_text = (
                    "No selectable text or readable handwriting could be extracted. "
                    "You may manually paste the document contents here for AI analysis."
                )

            return {
                "filename": filename,
                "file_type": "pdf",
                "file_size": file_size,
                "extracted_text": full_text,
                "ocr_applied": ocr_applied,
                "page_count": page_count,
                "status": "ready",
                "ocr_notes": list(set(ocr_notes)),
            }

        except Exception as e:
            logger.exception("Error reading PDF with PyMuPDF")
            return {
                "filename": filename,
                "file_type": "pdf",
                "file_size": file_size,
                "extracted_text": f"Error opening PDF document: {str(e)}",
                "ocr_applied": False,
                "page_count": 0,
                "status": "error",
                "error": str(e),
            }

    def _process_image(self, file_bytes: bytes, filename: str, file_size: int) -> Dict[str, Any]:
        """
        Runs OpenCV preprocessing and Tesseract OCR on image file.
        """
        ocr_res = ocr_service.extract_text_from_image(file_bytes)
        return {
            "filename": filename,
            "file_type": filename.rsplit(".", 1)[-1].lower() if "." in filename else "image",
            "file_size": file_size,
            "extracted_text": ocr_res.get("extracted_text", ""),
            "ocr_applied": True,
            "page_count": 1,
            "status": "ready" if ocr_res.get("success") else "ocr_notice",
            "metrics": ocr_res.get("metrics"),
            "notice": ocr_res.get("notice"),
        }


document_service = DocumentService()
