export interface Staff {
  id: string;
  tenant_id?: string;
  user_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role_ids?: string[];
  service_ids?: string[];
  specialties: string[];
  certifications: string[];
  certification_files: string[];
  payment_type: "hourly" | "daily" | "weekly" | "monthly" | "commission";
  payment_rate: number | string;
  hire_date: string | null;
  bio: string | null;
  profile_image_url: string | null;
  status: "active" | "inactive" | "on_leave" | "terminated";
  is_available_for_public_booking?: boolean;
  rating?: number | string | null;
  review_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffListResponse {
  staff: Staff[];
  total: number;
  page: number;
  page_size: number;
}

export interface StaffPayload {
  user_id?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role_ids?: string[];
  service_ids?: string[];
  specialties?: string[];
  certifications?: string[];
  certification_files?: string[];
  payment_type: Staff["payment_type"];
  payment_rate: number | string;
  hire_date?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  status: Staff["status"];
  is_available_for_public_booking?: boolean;
}
