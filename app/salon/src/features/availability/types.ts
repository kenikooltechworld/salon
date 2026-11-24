export interface AvailabilityBreak {
  start_time: string;
  end_time: string;
}

export interface StaffAvailability {
  id: string;
  staff_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  effective_from: string;
  effective_to: string | null;
  breaks: AvailabilityBreak[];
  slot_interval_minutes: number;
  buffer_time_minutes: number;
  concurrent_bookings_allowed: number;
  is_active: boolean;
  notes: string | null;
}

export interface AvailabilityListResponse {
  availabilities: StaffAvailability[];
  total: number;
  page: number;
  page_size: number;
}

export interface AvailabilityPayload {
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  effective_from: string;
  effective_to: string | null;
  breaks: AvailabilityBreak[];
  slot_interval_minutes: number;
  buffer_time_minutes: number;
  concurrent_bookings_allowed: number;
  is_active: boolean;
  notes: string | null;
}
