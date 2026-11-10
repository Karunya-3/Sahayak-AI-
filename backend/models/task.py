from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    user_id: Optional[str] = "default_user"
    task_description: str
    due_date: Optional[str] = None  # e.g. "2026-11-10" or "Monday"
    priority: Optional[str] = "medium"  # low, medium, high
    category: Optional[str] = "general"  # bill, work, personal, school
    status: Optional[str] = "pending"  # pending, completed


class TaskUpdate(BaseModel):
    task_description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    task_id: str
    user_id: str
    task_description: str
    due_date: Optional[str] = None
    priority: str = "medium"
    category: str = "general"
    status: str = "pending"
    created_date: str
    updated_date: Optional[str] = None


class TaskExtractRequest(BaseModel):
    query: str
    language: Optional[str] = "hi-IN"


class TaskExtractResponse(BaseModel):
    is_task: bool
    task_description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"
    category: Optional[str] = "general"
    requires_confirmation: bool = True
    confirmation_prompt: Optional[str] = None
