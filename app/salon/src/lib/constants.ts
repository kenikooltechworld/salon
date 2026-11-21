// Shared constants used across the frontend for consistency.
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export const USER_STATUS_ACTIVE = "active";
export const USER_STATUS_INACTIVE = "inactive";

export const ROLE_OWNER = "owner";
export const ROLE_MANAGER = "manager";
export const ROLE_STAFF = "staff";
export const ROLE_CUSTOMER = "customer";

export const APPOINTMENT_STATUS_SCHEDULED = "scheduled";
export const APPOINTMENT_STATUS_CONFIRMED = "confirmed";
export const APPOINTMENT_STATUS_COMPLETED = "completed";
export const APPOINTMENT_STATUS_CANCELLED = "cancelled";

export const PASSWORD_MIN_LENGTH = 8;
