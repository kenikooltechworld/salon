import { apiClient } from "@/lib/api";
import type { AvailabilityListResponse, AvailabilityPayload, StaffAvailability } from "./types";

export const availabilityApi = {
  list: (staffId: string) =>
    apiClient.get<AvailabilityListResponse>("/availability", {
      params: { staff_id: staffId, page: 1, page_size: 100 },
    }),
  create: (staffId: string, payload: AvailabilityPayload) =>
    apiClient.post<StaffAvailability>("/availability", { ...payload, staff_id: staffId }),
  update: (id: string, payload: Partial<AvailabilityPayload>) =>
    apiClient.put<StaffAvailability>(`/availability/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/availability/${id}`),
};
