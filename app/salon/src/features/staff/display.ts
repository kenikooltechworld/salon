export interface StaffDisplayData {
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  profile_image_url?: string | null;
  profileImageUrl?: string | null;
}

export function getStaffDisplayName(
  staff: StaffDisplayData | null | undefined,
  fallback = "Staff member",
): string {
  if (!staff) return fallback;
  const firstName = staff.firstName || staff.first_name;
  const lastName = staff.lastName || staff.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || staff.name?.trim() || fallback;
}

export function getStaffImageUrl(
  staff: StaffDisplayData | null | undefined,
): string | undefined {
  return staff?.profile_image_url || staff?.profileImageUrl || undefined;
}
