import re
from typing import Tuple

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".txt"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15MB


def validate_file_upload(filename: str, size: int) -> Tuple[bool, str]:
    """
    Validates uploaded document extension and size limits.
    """
    if size <= 0:
        return False, "File is empty."

    if size > MAX_FILE_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."

    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '{ext}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}."

    return True, "Valid"


def sanitize_filename(filename: str) -> str:
    """
    Strips directory traversal characters and unsafe symbols from filename.
    """
    base = filename.split("/")[-1].split("\\")[-1]
    cleaned = re.sub(r"[^\w\.\-\_]", "_", base)
    return cleaned or "file"
