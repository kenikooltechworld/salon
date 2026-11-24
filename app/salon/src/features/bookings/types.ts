export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface Booking {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  staff_id: string;
  service_id: string;
  location_id?: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  price?: string | number | null;
  is_guest: boolean;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  payment_option?: string | null;
  payment_status?: string | null;
  cancellation_reason?: string | null;
  no_show_reason?: string | null;
  cancelled_at?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingDetail extends Booking {
  customer?: { id: string; first_name?: string; last_name?: string; email?: string; phone?: string; profile_image_url?: string | null } | null;
  service?: { id: string; name?: string; duration_minutes?: number; price?: string | null; public_image_url?: string | null } | null;
  staff?: { id: string; user_id?: string; first_name?: string; last_name?: string; email?: string; phone?: string; profile_image_url?: string | null } | null;
}

export interface BookingListResponse { appointments: Booking[]; total: number; page: number; page_size: number; }
export interface BookingCreate { staff_id: string; service_id: string; customer_id?: string | null; start_time: string; end_time: string; notes?: string | null; price?: string | number | null; is_guest?: boolean; guest_name?: string | null; guest_email?: string | null; guest_phone?: string | null; payment_option?: string | null; payment_status?: string | null; }
export interface BookingUpdate { status?: AppointmentStatus; notes?: string | null; cancellation_reason?: string | null; no_show_reason?: string | null; payment_status?: string | null; price?: string | number | null; }
