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
IMAGE_SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": ("png", "image/png"),
    b"\xff\xd8\xff": ("jpg", "image/jpeg"),
    b"GIF87a": ("gif", "image/gif"),
    b"GIF89a": ("gif", "image/gif"),
    b"RIFF": ("webp", "image/webp"),
}


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


def _detect_image_type(data: bytes, base64_data: str) -> tuple[str, str]:
    for sig, (ext, content_type) in IMAGE_SIGNATURES.items():
        if data.startswith(sig):
            if ext == "webp" and data[8:12] != b"WEBP":
                continue
            return ext, content_type
    lower = base64_data.lower()
    if lower.startswith("data:image/png"):
        return "png", "image/png"
    if lower.startswith("data:image/webp"):
        return "webp", "image/webp"
    if lower.startswith("data:image/gif"):
        return "gif", "image/gif"
    if lower.startswith("data:image/jpeg") or lower.startswith("data:image/jpg"):
        return "jpg", "image/jpeg"
    return "jpg", "image/jpeg"


def upload_media(base64_data: str, media_type: str = "image", folder: str = "salon-media", tenant_id: str | None = None) -> str:
    try:
        raw = base64_data.split(",", 1)[1] if "," in base64_data else base64_data
        data = base64.b64decode(raw, validate=False)
    except Exception as e:
        raise MediaUploadError(f"Invalid base64 data: {e}") from e

    max_size = FILE_SIZE_LIMITS.get(media_type, FILE_SIZE_LIMITS["image"])
    if len(data) > max_size:
        raise MediaUploadError(f"File exceeds {max_size // (1024 * 1024)}MB limit")

    ext = "bin"
    content_type = "application/octet-stream"
    if media_type == "image":
        try:
            from PIL import Image

            with Image.open(io.BytesIO(data)) as img:
                img.verify()
        except Exception as e:
            raise MediaUploadError("Invalid image file") from e
        ext, content_type = _detect_image_type(data, base64_data)

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
