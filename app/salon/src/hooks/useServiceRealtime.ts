import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";

const SERVICE_TYPES = new Set([
  "service_created","service_updated","service_deleted","service_activated","service_deactivated",
  "service_category_created","service_category_updated","service_category_deleted",
  "service_addon_created","service_addon_updated","service_addon_deleted",
  "service_package_created","service_package_updated","service_package_deleted","service_package_activated","service_package_deactivated",
  "commission_earned","commission_paid",
]);

export function useServiceRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (n: any) => {
      if (n?.type && SERVICE_TYPES.has(n.type)) qc.invalidateQueries({ queryKey: ["services"] });
    };
    socket.on("notification:new", handler);
    return () => { socket.off("notification:new", handler); };
  }, [qc]);
}
