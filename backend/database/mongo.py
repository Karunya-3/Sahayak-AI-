import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import settings

logger = logging.getLogger("sahayak.database")

# Global DB reference
_db_instance = None
_is_fallback_mode = False


def get_db():
    global _db_instance, _is_fallback_mode
    if _db_instance is not None:
        return _db_instance

    uri = settings.MONGODB_URI
    uri_lower = uri.lower()
    is_placeholder = any(p in uri_lower for p in ["<username>", "<password>", "your_", "placeholder", "<user>"])

    if not is_placeholder:
        try:
            logger.info("Attempting connection to MongoDB Atlas...")
            client = MongoClient(uri, serverSelectionTimeoutMS=8000)
            # Trigger server selection check
            client.admin.command("ping")
            _db_instance = client[settings.MONGODB_DB_NAME]
            _is_fallback_mode = False
            logger.info(f"Connected successfully to MongoDB Atlas database: {settings.MONGODB_DB_NAME}")
            return _db_instance
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            logger.warning(
                f"MongoDB connection to Atlas failed ({e}). Switching to resilient local in-memory storage."
            )

    # Fallback to mongomock
    try:
        import mongomock
        mock_client = mongomock.MongoClient()
        _db_instance = mock_client[settings.MONGODB_DB_NAME]
        _is_fallback_mode = True
        logger.info(
            "MongoDB Atlas placeholder detected or network unavailable. "
            "Sahayak AI is running with resilient In-Memory MongoDB. "
            "All operations (tasks, documents, chat history) will function seamlessly."
        )
    except Exception as e:
        logger.error(f"Failed to initialize mongomock: {e}")
        raise e

    return _db_instance


def is_in_memory_mode() -> bool:
    global _is_fallback_mode
    get_db()
    return _is_fallback_mode


# Helper CRUD Operations

# --- USERS ---
def get_user(user_id: str = "default_user") -> Dict[str, Any]:
    db = get_db()
    user = db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        user = {
            "user_id": user_id,
            "name": "Sahayak User",
            "preferred_language": "hi-IN",
            "created_date": datetime.now(timezone.utc).isoformat(),
        }
        db.users.insert_one(user.copy())
    return user


def update_user_preferences(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    db = get_db()
    db.users.update_one({"user_id": user_id}, {"$set": updates}, upsert=True)
    return get_user(user_id)


# --- CONVERSATIONS ---
def get_or_create_conversation(conversation_id: Optional[str] = None, user_id: str = "default_user") -> Dict[str, Any]:
    db = get_db()
    if conversation_id:
        conv = db.conversations.find_one({"conversation_id": conversation_id, "user_id": user_id}, {"_id": 0})
        if conv:
            return conv

    cid = conversation_id or str(uuid.uuid4())
    conv = {
        "conversation_id": cid,
        "user_id": user_id,
        "title": "New Conversation",
        "messages": [],
        "created_date": datetime.now(timezone.utc).isoformat(),
        "updated_date": datetime.now(timezone.utc).isoformat(),
    }
    db.conversations.insert_one(conv.copy())
    return conv


def add_message_to_conversation(
    conversation_id: str,
    user_id: str,
    role: str,
    content: str,
    audio_url: Optional[str] = None,
    language: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    db = get_db()
    message = {
        "message_id": str(uuid.uuid4()),
        "role": role,
        "content": content,
        "audio_url": audio_url,
        "language": language or "en-IN",
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # If first message, update title
    conv = db.conversations.find_one({"conversation_id": conversation_id, "user_id": user_id})
    update_data = {
        "$push": {"messages": message},
        "$set": {"updated_date": datetime.now(timezone.utc).isoformat()},
    }
    if conv and (not conv.get("messages") or len(conv.get("messages", [])) == 0) and role == "user":
        # Shorten title
        title = content.strip().split("\n")[0][:45]
        update_data["$set"]["title"] = title

    db.conversations.update_one(
        {"conversation_id": conversation_id, "user_id": user_id},
        update_data,
        upsert=True,
    )
    return message


def list_conversations(user_id: str = "default_user", limit: int = 30) -> List[Dict[str, Any]]:
    db = get_db()
    cursor = db.conversations.find(
        {"user_id": user_id},
        {"_id": 0, "conversation_id": 1, "title": 1, "created_date": 1, "updated_date": 1, "messages": {"$slice": -1}},
    ).sort("updated_date", -1).limit(limit)
    return list(cursor)


def clear_conversation(conversation_id: str, user_id: str = "default_user") -> bool:
    db = get_db()
    res = db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user_id})
    return res.deleted_count > 0


# --- DOCUMENTS ---
def save_document(doc_data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_db()
    if "document_id" not in doc_data:
        doc_data["document_id"] = str(uuid.uuid4())
    if "upload_date" not in doc_data:
        doc_data["upload_date"] = datetime.now(timezone.utc).isoformat()

    doc_to_save = doc_data.copy()
    db.documents.insert_one(doc_to_save)
    # return without mongo _id
    return {k: v for k, v in doc_data.items() if k != "_id"}


def get_document(document_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    db = get_db()
    query: Dict[str, Any] = {"document_id": document_id}
    if user_id:
        query["user_id"] = user_id
    doc = db.documents.find_one(query, {"_id": 0})
    if not doc:
        doc = db.documents.find_one({"document_id": document_id}, {"_id": 0})
    return doc


def list_documents(user_id: str = "default_user") -> List[Dict[str, Any]]:
    db = get_db()
    cursor = db.documents.find(
        {"user_id": user_id},
        {"_id": 0, "document_id": 1, "filename": 1, "file_type": 1, "file_size": 1, "upload_date": 1, "summary": 1, "status": 1},
    ).sort("upload_date", -1)
    return list(cursor)


def update_document_text(document_id: str, user_id: str, new_text: str) -> bool:
    db = get_db()
    res = db.documents.update_one(
        {"document_id": document_id, "user_id": user_id},
        {"$set": {"extracted_text": new_text, "updated_date": datetime.now(timezone.utc).isoformat()}},
    )
    return res.modified_count > 0


def delete_document(document_id: str, user_id: str = "default_user") -> bool:
    db = get_db()
    res = db.documents.delete_one({"document_id": document_id, "user_id": user_id})
    return res.deleted_count > 0


# --- TASKS ---
def create_task(task_data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_db()
    if "task_id" not in task_data:
        task_data["task_id"] = str(uuid.uuid4())
    if "status" not in task_data:
        task_data["status"] = "pending"
    if "created_date" not in task_data:
        task_data["created_date"] = datetime.now(timezone.utc).isoformat()

    db.tasks.insert_one(task_data.copy())
    return {k: v for k, v in task_data.items() if k != "_id"}


def list_tasks(user_id: str = "default_user", status: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_db()
    query: Dict[str, Any] = {"user_id": user_id}
    if status and status != "all":
        query["status"] = status
    cursor = db.tasks.find(query, {"_id": 0}).sort("created_date", -1)
    return list(cursor)


def update_task(task_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = get_db()
    updates["updated_date"] = datetime.now(timezone.utc).isoformat()
    db.tasks.update_one({"task_id": task_id, "user_id": user_id}, {"$set": updates})
    return db.tasks.find_one({"task_id": task_id, "user_id": user_id}, {"_id": 0})


def delete_task(task_id: str, user_id: str = "default_user") -> bool:
    db = get_db()
    res = db.tasks.delete_one({"task_id": task_id, "user_id": user_id})
    return res.deleted_count > 0
