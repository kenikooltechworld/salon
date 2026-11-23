import { create } from "zustand";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

export interface NotificationItem {
  id: string;
  notification_type: string;
  title?: string | null;
  content: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  push: (n: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loaded: false,
  loading: false,
  push: (n) => set((s) => ({ items: [n, ...s.items].slice(0, 50), unreadCount: s.unreadCount + (n.is_read ? 0 : 1) })),
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data } = await api.get("/notifications", { params: { page: 1, page_size: 20 } });
      set({ items: data.notifications ?? [], unreadCount: data.unread_count ?? 0, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  markRead: async (id) => {
    await api.post(`/notifications/${id}/read`);
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - (s.items.find((n) => n.id === id && !n.is_read) ? 1 : 0)),
    }));
  },
  markAllRead: async () => {
    await api.post("/notifications/read-all");
    set((s) => ({ items: s.items.map((n) => ({ ...n, is_read: true })), unreadCount: 0 }));
  },
  connectRealtime: () => {
    const socket = connectSocket();
    socket.off("notification:new");
    socket.on("notification:new", (payload: NotificationItem) => {
      get().push({ ...payload, is_read: payload.is_read ?? false });
    });
  },
  disconnectRealtime: () => {
    const s = getSocket();
    if (s) s.off("notification:new");
    disconnectSocket();
  },
}));
