import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from models.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskExtractRequest,
    TaskExtractResponse,
)
from database.mongo import (
    create_task,
    list_tasks,
    update_task,
    delete_task,
)
from services.evon_service import evon_service

logger = logging.getLogger("sahayak.routes.tasks")
router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    user_id: str = "default_user",
    status: Optional[str] = Query(None, description="all | pending | completed"),
):
    """
    Fetches tasks for user with optional status filter.
    """
    status_val = None if hasattr(status, "default") else status
    tasks = list_tasks(user_id=user_id, status=status_val)
    return [TaskResponse(**t) for t in tasks]


@router.post("", response_model=TaskResponse)
async def add_task(task_in: TaskCreate):
    """
    Creates a new task in MongoDB.
    """
    try:
        task_data = task_in.model_dump()
        created = create_task(task_data)
        return TaskResponse(**created)
    except Exception as e:
        logger.exception("Error creating task")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task_item(task_id: str, updates: TaskUpdate, user_id: str = "default_user"):
    """
    Updates status, due date, description, or priority of a task.
    """
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided.")

    updated = update_task(task_id, user_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskResponse(**updated)


@router.delete("/{task_id}")
async def remove_task(task_id: str, user_id: str = "default_user"):
    """
    Deletes a task from MongoDB.
    """
    success = delete_task(task_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found.")
    return {"success": True, "task_id": task_id}


@router.post("/extract", response_model=TaskExtractResponse)
async def extract_task_from_speech(req: TaskExtractRequest):
    """
    Analyzes spoken text (or typed query) to extract task description, due date,
    priority, and category with confirmation before saving.
    """
    try:
        extracted = await evon_service.extract_task(req.query, language=req.language or "hi-IN")
        return TaskExtractResponse(**extracted)
    except Exception as e:
        logger.exception("Error extracting task")
        raise HTTPException(status_code=500, detail=str(e))
