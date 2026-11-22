"""Media upload routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.lib.deps import get_current_user
from app.models.user import User
from app.services.media_service import MediaUploadError, upload_media

router = APIRouter(prefix="/media", tags=["media"])


class MediaUploadRequest(BaseModel):
    base64_data: str = Field(..., min_length=1)
    media_type: str = Field(default="image")
    folder: str = Field(default="salon-media")


class MediaUploadResponse(BaseModel):
    url: str
    message: str = "Media uploaded successfully"


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media_endpoint(request: MediaUploadRequest, current_user: User = Depends(get_current_user)):
    try:
        url = upload_media(request.base64_data, request.media_type, request.folder, str(current_user.tenant_id))
        return MediaUploadResponse(url=url)
    except MediaUploadError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Media upload failed") from e
