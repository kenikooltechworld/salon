"""Media controller."""
from __future__ import annotations

from app.services.media_service import MediaUploadError, upload_media


class MediaController:
    @staticmethod
    def upload(*, base64_data: str, media_type: str, folder: str, tenant_id: str) -> str:
        return upload_media(base64_data, media_type, folder, tenant_id)


__all__ = ["MediaController", "MediaUploadError"]
