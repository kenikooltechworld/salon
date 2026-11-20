"""Tests for ORM base and mixins."""

import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class SampleEntity(UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "sample_entities"

    name: Mapped[str] = mapped_column(String(50), nullable=False)


def test_base_mixins_columns_present() -> None:
    cols = SampleEntity.__table__.columns
    assert "id" in cols
    assert "created_at" in cols
    assert "updated_at" in cols
    assert "tenant_id" in cols
    assert "name" in cols


def test_primary_key_and_tenant_types() -> None:
    assert isinstance(SampleEntity.__table__.c.id.type, UUID)
    assert isinstance(SampleEntity.__table__.c.tenant_id.type, UUID)
    assert SampleEntity.__table__.c.tenant_id.index is True


def test_base_metadata_registers_model() -> None:
    assert "sample_entities" in Base.metadata.tables