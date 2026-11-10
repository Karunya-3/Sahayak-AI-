import os
import shutil
import logging
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, Tuple, Optional
from config import settings

logger = logging.getLogger("sahayak.services.ocr")

# Try to configure pytesseract
try:
    import pytesseract
    tess_path = settings.TESSERACT_CMD
    if not tess_path:
        for common_path in [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]:
            if os.path.exists(common_path):
                tess_path = common_path
                break

    if tess_path and os.path.exists(tess_path):
        pytesseract.pytesseract.tesseract_cmd = tess_path
        logger.info(f"Tesseract OCR path configured: {tess_path}")
        TESSERACT_AVAILABLE = True
    else:
        # Check PATH quickly
        tess_in_path = shutil.which("tesseract")
        if tess_in_path and os.path.exists(tess_in_path):
            pytesseract.pytesseract.tesseract_cmd = tess_in_path
            TESSERACT_AVAILABLE = True
        else:
            TESSERACT_AVAILABLE = False
            logger.info("Tesseract binary not found in standard paths.")
except Exception as e:
    logger.warning(f"Failed to initialize pytesseract: {e}")
    TESSERACT_AVAILABLE = False


class OCRService:
    """
    OpenCV Preprocessing & Tesseract OCR Service.
    Performs image optimization (grayscale, noise removal, Otsu thresholding, deskewing)
    and multilingual text extraction (English, Hindi, Telugu).
    """

    def __init__(self):
        self.languages = "eng+hin+tel"

    def preprocess_image(self, image_np: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        OpenCV pipeline:
        1. Resizing (upscale if small for better character resolution)
        2. Grayscale conversion
        3. Noise removal using Bilateral Filter (preserves text edges)
        4. Deskewing
        5. Otsu Adaptive Thresholding
        """
        metrics = {}
        h, w = image_np.shape[:2]
        metrics["original_dimensions"] = f"{w}x{h}"

        # 1. Resize if image is low-res
        if w < 1000 or h < 1000:
            scale_factor = 1.5
            image_np = cv2.resize(
                image_np,
                (int(w * scale_factor), int(h * scale_factor)),
                interpolation=cv2.INTER_CUBIC,
            )
            metrics["resized"] = True
        else:
            metrics["resized"] = False

        # 2. Grayscale conversion
        if len(image_np.shape) == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        else:
            gray = image_np

        # 3. Noise removal (Bilateral filter smoothes flat areas while preserving edges)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # 4. Deskewing
        deskewed, angle = self._deskew(denoised)
        metrics["deskew_angle"] = round(angle, 2)

        # 5. Otsu's thresholding for high contrast text binarization
        _, thresholded = cv2.threshold(
            deskewed, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )

        return thresholded, metrics

    def _deskew(self, image: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Calculates skew angle of the text and rotates image.
        """
        try:
            # Invert colors so text is white
            inv = cv2.bitwise_not(image)
            coords = np.column_stack(np.where(inv > 0))
            if len(coords) < 100:
                return image, 0.0

            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle

            # Only rotate if significant skew (> 0.5 degrees and < 45 degrees)
            if abs(angle) > 0.5 and abs(angle) < 45:
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(
                    image,
                    M,
                    (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE,
                )
                return rotated, angle
        except Exception as e:
            logger.debug(f"Deskew skipped: {e}")

        return image, 0.0

    def extract_text_from_image(self, image_bytes: bytes, lang: Optional[str] = None) -> Dict[str, Any]:
        """
        Converts image bytes, applies OpenCV preprocessing, and runs Tesseract OCR.
        """
        try:
            # Decode bytes with OpenCV
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                return {
                    "success": False,
                    "error": "Could not decode image file format.",
                    "extracted_text": "",
                }

            # Preprocess image
            processed_img, metrics = self.preprocess_image(img)

            # Check Tesseract availability
            if not TESSERACT_AVAILABLE:
                logger.warning("Tesseract binary not installed on host. Providing detailed guidance.")
                return {
                    "success": False,
                    "extracted_text": (
                        "[OCR Notice]: Tesseract OCR engine binary is not installed on this system. "
                        "To perform optical character recognition on scanned images and non-selectable PDFs, "
                        "install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki or configure TESSERACT_CMD in backend/.env. "
                        "You can manually paste or type the document text in the editor below to proceed with Evon analysis."
                    ),
                    "ocr_applied": False,
                    "metrics": metrics,
                    "notice": "Tesseract binary required for image OCR. Native text PDFs are fully supported via PyMuPDF.",
                }

            # Run Tesseract with multi-lingual support
            ocr_lang = lang or self.languages
            pil_img = Image.fromarray(processed_img)

            try:
                text = pytesseract.image_to_string(pil_img, lang=ocr_lang)
            except pytesseract.TesseractError:
                # If Hindi/Telugu traineddata not present in tessdata, fallback to English
                logger.info("Retrying Tesseract with fallback 'eng' language pack...")
                text = pytesseract.image_to_string(pil_img, lang="eng")

            clean_text = text.strip()
            if not clean_text:
                return {
                    "success": True,
                    "extracted_text": "No readable text could be recognized from the image.",
                    "ocr_applied": True,
                    "metrics": metrics,
                    "is_empty": True,
                }

            return {
                "success": True,
                "extracted_text": clean_text,
                "ocr_applied": True,
                "metrics": metrics,
                "confidence": "high" if len(clean_text) > 30 else "low",
            }

        except Exception as e:
            logger.exception("Error executing OCR pipeline")
            return {
                "success": False,
                "error": f"OCR extraction error: {str(e)}",
                "extracted_text": "",
            }


ocr_service = OCRService()
