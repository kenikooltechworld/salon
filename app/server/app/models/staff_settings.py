"""Staff settings model."""
from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class StaffSettings(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "staff_settings"

    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email_bookings: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_messages: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sms_bookings: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sms_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    push_bookings: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    push_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    working_hours_start: Mapped[str | None] = mapped_column(String(5), nullable=True)
    working_hours_end: Mapped[str | None] = mapped_column(String(5), nullable=True)
    days_off: Mapped[list[str] | None] = mapped_column(ARRAY(String(20)), nullable=True, default=list)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact_relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    service_specializations: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)), nullable=True, default=list)
    preferred_customer_types: Mapped[list[str] | None] = mapped_column(ARRAY(String(50)), nullable=True, default=list)
