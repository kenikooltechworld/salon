from __future__ import annotations

import base64
import io
import logging
import uuid

import boto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)
FILE_SIZE_LIMITS = {"image": 5 * 1024 * 1024, "document": 10 * 1024 * 1024}


class MediaUploadError(Exception):
    pass


def _client():
    if not all([settings.cloudflare_access_key, settings.cloudflare_secret_access_key, settings.cloudflare_s3_api_endpoint, settings.cloudflare_r2_bucket]):
        raise MediaUploadError("Cloudflare R2 storage is not configured")
    return boto3.client(
        "s3",
        endpoint_url=settings.cloudflare_s3_api_endpoint,
        aws_access_key_id=settings.cloudflare_access_key,
        aws_secret_access_key=settings.cloudflare_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_media(base64_data: str, media_type: str = "image", folder: str = "salon-media", tenant_id: str | None = None) -> str:
    try:
        raw = base64_data.split(",", 1)[1] if "," in base64_data else base64_data
        data = base64.b64decode(raw)
    except Exception as e:
        raise MediaUploadError(f"Invalid base64 data: {e}") from e

    max_size = FILE_SIZE_LIMITS.get(media_type, FILE_SIZE_LIMITS["image"])
    if len(data) > max_size:
        raise MediaUploadError(f"File exceeds {max_size // (1024 * 1024)}MB limit")
    if media_type == "image":
        # basic image validation
        try:
            from PIL import Image
            Image.open(io.BytesIO(data)).verify()
        except Exception as e:
            raise MediaUploadError("Invalid image file") from e

    ext = "jpg"
    if raw[:20].startswith("/9j/") or base64_data.startswith("data:image/jpeg"):
        ext = "jpg"
    elif base64_data.startswith("data:image/png"):
        ext = "png"
    elif base64_data.startswith("data:image/webp"):
        ext = "webp"
    elif base64_data.startswith("data:image/gif"):
        ext = "gif"
    content_type = {
        "jpg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"
    }.get(ext, "application/octet-stream")

    key = f"{folder.strip('/')}/{tenant_id or 'public'}/{uuid.uuid4().hex}.{ext}"
    try:
        client = _client()
        client.put_object(Bucket=settings.cloudflare_r2_bucket, Key=key, Body=data, ContentType=content_type)
    except MediaUploadError:
        raise
    except Exception as e:
        logger.exception("R2 upload failed")
        raise MediaUploadError("Image upload failed") from e

    public_base = settings.cloudflare_r2_public_url.rstrip("/")
    if not public_base:
        raise MediaUploadError("Cloudflare R2 public URL is not configured")
    return f"{public_base}/{key}"
