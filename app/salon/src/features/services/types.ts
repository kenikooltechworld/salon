export interface ServiceCategory {
  id: string; tenant_id: string; name: string; description?: string | null;
  color?: string | null; icon?: string | null; is_active: boolean; created_at: string; updated_at: string;
}
export interface Service {
  id: string; tenant_id: string; name: string; description?: string | null;
  duration_minutes: number; price: string | number; category: string;
  color?: string | null; icon?: string | null; is_active: boolean; is_published: boolean;
  public_description?: string | null; public_image_url?: string | null;
  allow_public_booking: boolean; allow_pay_now: boolean;
  tags: string[]; benefits: string[]; commission_percentage?: string | number | null;
  staff_ids: string[]; created_at: string; updated_at: string;
}
export interface ServiceListResponse { services: Service[]; total: number; page: number; page_size: number; }
export interface ServiceCategoryListResponse { categories: ServiceCategory[]; total: number; }
export interface ServiceAddon {
  id: string; tenant_id: string; name: string; description: string; price: string | number;
  duration_minutes: number; image_url?: string | null; is_active: boolean;
  applicable_service_ids: string[]; applicable_services?: string[]; category: string; display_order: number;
  created_at: string; updated_at: string;
}
export interface ServiceAddonListResponse { addons: ServiceAddon[]; total: number; }
export interface ServicePackageItem {
  service_id: string; quantity: number; service_name?: string | null;
  service_price?: string | number | null; service_duration_minutes?: number | null; service_duration?: number | null;
}
export interface ServicePackage {
  id: string; tenant_id: string; name: string; description?: string | null;
  services: ServicePackageItem[]; original_price: string | number; package_price: string | number;
  discount_amount: string | number; discount_percentage: string | number;
  valid_from?: string | null; valid_until?: string | null; is_active: boolean;
  max_bookings_per_customer?: number | null; total_bookings_limit?: number | null;
  current_bookings_count: number; image_url?: string | null; display_order: number;
  is_featured: boolean; is_valid?: boolean; total_duration_minutes?: number; total_duration?: number;
  savings?: { amount: number; percentage: number; original_price: number; package_price: number };
  created_at: string; updated_at: string;
}
export interface ServicePackageListResponse { packages: ServicePackage[]; total: number; page: number; page_size: number; total_pages?: number; }
export interface ServiceCommission {
  id: string; tenant_id: string; staff_id: string; appointment_id: string; service_id: string;
  service_price: string | number; commission_percentage: string | number; commission_amount: string | number;
  status: string; earned_date: string; paid_date?: string | null; created_at: string; updated_at: string;
}
export interface CommissionSummary { total_earned: string | number; total_pending: string | number; total_paid: string | number; total_services: number; average_commission: string | number; }
export interface CommissionByService { service_id: string; service_name?: string | null; total_commission: string | number; count: number; }
export interface CommissionSummaryResponse { summary: CommissionSummary; breakdown: CommissionByService[]; }
export interface CommissionListResponse { commissions: ServiceCommission[]; total: number; page: number; page_size: number; }
