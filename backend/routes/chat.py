import logging
from fastapi import APIRouter, HTTPException
from models.chat import ChatRequest, ChatResponse, ChatMessage, TranslationRequest, TranslationResponse
from services.evon_service import evon_service
from services.timbre_service import timbre_service
from database.mongo import (
    get_or_create_conversation,
    add_message_to_conversation,
    list_conversations,
    clear_conversation,
)

logger = logging.getLogger("sahayak.routes.chat")
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(req: ChatRequest):
    """
    Sends user query to Evon reasoning engine, updates conversation in MongoDB,
    and optionally synthesizes spoken audio using Timbre TTS.
    """
    try:
        user_id = req.user_id or "default_user"
        # Get existing conversation history
        conv = get_or_create_conversation(req.conversation_id, user_id=user_id)
        conv_id = conv["conversation_id"]

        # Save user message to database
        user_msg = add_message_to_conversation(
            conversation_id=conv_id,
            user_id=user_id,
            role="user",
            content=req.message,
            language=req.language,
        )

        # Evon reasoning with document grounding if provided
        history = [
            {"role": m["role"], "content": m["content"]}
            for m in conv.get("messages", [])
        ]

        evon_result = await evon_service.chat(
            user_message=req.message,
            conversation_history=history,
            language=req.language or "hi-IN",
            document_context=req.document_context,
        )

        assistant_content = evon_result.get("content", "")
        extracted_action = evon_result.get("extracted_action")

        # Optional audio synthesis with Timbre
        audio_b64 = None
        if req.generate_speech and assistant_content:
            tts_res = await timbre_service.synthesize_speech(
                text=assistant_content[:350],  # Read first sentences smoothly
                language=req.language or "hi-IN",
            )
            if tts_res.get("success"):
                audio_b64 = tts_res.get("audio_base64")

        # Save assistant message to database
        assistant_msg = add_message_to_conversation(
            conversation_id=conv_id,
            user_id=user_id,
            role="assistant",
            content=assistant_content,
            audio_url=audio_b64,
            language=req.language,
            metadata={
                "extracted_action": extracted_action,
                "provider": evon_result.get("provider"),
            },
        )

        return ChatResponse(
            conversation_id=conv_id,
            user_id=user_id,
            user_message=ChatMessage(**user_msg),
            assistant_message=ChatMessage(**assistant_msg),
            audio_base64=audio_b64,
            extracted_action=extracted_action,
        )

    except Exception as e:
        logger.exception("Error in /api/chat/message")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def get_conversations(user_id: str = "default_user"):
    """
    Returns list of conversations for sidebar / recent interactions.
    """
    return list_conversations(user_id=user_id)


@router.get("/conversations/{conversation_id}")
async def get_conversation_history(conversation_id: str, user_id: str = "default_user"):
    """
    Gets full history of a specific conversation.
    """
    conv = get_or_create_conversation(conversation_id, user_id=user_id)
    return conv


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = "default_user"):
    """
    Clears / deletes a conversation from database.
    """
    success = clear_conversation(conversation_id, user_id=user_id)
    return {"success": success, "conversation_id": conversation_id}


@router.post("/translate", response_model=TranslationResponse)
async def translate_or_rewrite_text(req: TranslationRequest):
    """
    Translates or rewrites text into polite, formal, simple language using Evon.
    """
    try:
        res = await evon_service.translate_or_rewrite(
            text=req.text,
            target_language=req.target_language,
            tone=req.tone or "natural",
            source_language=req.source_language or "auto",
        )
        return TranslationResponse(**res)
    except Exception as e:
        logger.exception("Error in /api/chat/translate")
        raise HTTPException(status_code=500, detail=str(e))
