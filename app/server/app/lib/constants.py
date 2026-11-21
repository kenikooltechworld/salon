"""Shared constants used across the backend for consistency."""
from __future__ import annotations

# HTTP / cookie names
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

# Token types
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# User statuses
USER_STATUS_ACTIVE = "active"
USER_STATUS_INACTIVE = "inactive"
USER_STATUS_LOCKED = "locked"

# Tenant statuses
TENANT_STATUS_ACTIVE = "active"
TENANT_STATUS_INACTIVE = "inactive"
TENANT_STATUS_SUSPENDED = "suspended"

# Roles
ROLE_OWNER = "owner"
ROLE_MANAGER = "manager"
ROLE_STAFF = "staff"
ROLE_CUSTOMER = "customer"

VALID_ROLES = (ROLE_OWNER, ROLE_MANAGER, ROLE_STAFF, ROLE_CUSTOMER)

# Appointment statuses
APPOINTMENT_STATUS_SCHEDULED = "scheduled"
APPOINTMENT_STATUS_CONFIRMED = "confirmed"
APPOINTMENT_STATUS_IN_PROGRESS = "in_progress"
APPOINTMENT_STATUS_COMPLETED = "completed"
APPOINTMENT_STATUS_CANCELLED = "cancelled"
APPOINTMENT_STATUS_NO_SHOW = "no_show"

VALID_APPOINTMENT_STATUSES = (
    APPOINTMENT_STATUS_SCHEDULED,
    APPOINTMENT_STATUS_CONFIRMED,
    APPOINTMENT_STATUS_IN_PROGRESS,
    APPOINTMENT_STATUS_COMPLETED,
    APPOINTMENT_STATUS_CANCELLED,
    APPOINTMENT_STATUS_NO_SHOW,
)

# Service statuses (boolean flags handled separately)
SERVICE_CATEGORY_DEFAULT_COLOR = "#3B82F6"

# Customer statuses
CUSTOMER_STATUS_ACTIVE = "active"
CUSTOMER_STATUS_INACTIVE = "inactive"

# Staff statuses
STAFF_STATUS_ACTIVE = "active"
STAFF_STATUS_INACTIVE = "inactive"
STAFF_STATUS_ON_LEAVE = "on_leave"
STAFF_STATUS_TERMINATED = "terminated"

# Staff payment types
PAYMENT_TYPE_HOURLY = "hourly"
PAYMENT_TYPE_DAILY = "daily"
PAYMENT_TYPE_WEEKLY = "weekly"
PAYMENT_TYPE_MONTHLY = "monthly"
PAYMENT_TYPE_COMMISSION = "commission"

# Communication preferences
COMM_PREF_EMAIL = "email"
COMM_PREF_SMS = "sms"
COMM_PREF_PHONE = "phone"
COMM_PREF_NONE = "none"

# Subscription tiers
SUBSCRIPTION_TIER_TRIAL = "trial"
SUBSCRIPTION_TIER_BASIC = "basic"
SUBSCRIPTION_TIER_PRO = "pro"
SUBSCRIPTION_TIER_ENTERPRISE = "enterprise"

# Region defaults
DEFAULT_REGION = "us-east-1"

# Limits
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
JWT_ALGORITHM_DEFAULT = "HS256"
