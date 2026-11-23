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
  created_at: string;
  updated_at: string;
}

export interface BookingCreate {
  staff_id: string;
  service_id: string;
  customer_id?: string | null;
  start_time: string;
  end_time: string;
  notes?: string | null;
  price?: string | number | null;
  is_guest?: boolean;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  payment_option?: string | null;
}

export interface BookingUpdate {
  status?: AppointmentStatus;
  notes?: string | null;
  cancellation_reason?: string | null;
  no_show_reason?: string | null;
  payment_status?: string | null;
}

export interface BookingFilters {
  status?: string;
  staff_id?: string;
  customer_id?: string;
  service_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}
