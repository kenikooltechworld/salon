import { Badge } from "@chakra-ui/react";
import type { AppointmentStatus } from "@/features/bookings";

const config: Record<AppointmentStatus, { label: string; colorPalette: string }> = {
  scheduled: { label: "Scheduled", colorPalette: "blue" },
  confirmed: { label: "Confirmed", colorPalette: "green" },
  in_progress: { label: "In Progress", colorPalette: "orange" },
  completed: { label: "Completed", colorPalette: "purple" },
  cancelled: { label: "Cancelled", colorPalette: "red" },
  no_show: { label: "No Show", colorPalette: "gray" },
};

export function BookingStatusBadge({ status }: { status: AppointmentStatus }) {
  const c = config[status] || { label: status, colorPalette: "gray" };
  return <Badge colorPalette={c.colorPalette} variant="subtle">{c.label}</Badge>;
}
