from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..db import get_pool

router = APIRouter()

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime

@router.get("/", response_model=List[Notification])
async def get_notifications(limit: int = 50, unread_only: bool = False):
    pool = await get_pool()
    sql = """
        SELECT id, type, title, message, is_read, created_at 
        FROM public.notifications 
        WHERE ($1::boolean IS FALSE OR is_read = FALSE)
        ORDER BY created_at DESC 
        LIMIT $2
    """
    
    try:
        rows = await pool.fetch(sql, unread_only, limit)
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Notification)
async def create_notification(notification: NotificationCreate):
    pool = await get_pool()
    sql = """
        INSERT INTO public.notifications (type, title, message)
        VALUES ($1, $2, $3)
        RETURNING id, type, title, message, is_read, created_at
    """
    try:
        row = await pool.fetchrow(sql, notification.type, notification.title, notification.message)
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}/read")
async def mark_as_read(id: int):
    pool = await get_pool()
    sql = "UPDATE public.notifications SET is_read = TRUE WHERE id = $1"
    try:
        await pool.execute(sql, id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
