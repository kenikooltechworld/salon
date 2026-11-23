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
  connected: boolean;
  error: string | null;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  push: (n: NotificationItem) => void;
}

let listenersBound = false;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loaded: false,
  loading: false,
  connected: false,
  error: null,
  push: (n) =>
    set((s) => {
      const exists = s.items.some((x) => x.id === n.id);
      if (exists) return s;
      return {
        items: [n, ...s.items].slice(0, 50),
        unreadCount: s.unreadCount + (n.is_read ? 0 : 1),
      };
    }),
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/notifications", { params: { page: 1, page_size: 20 } });
      set({ items: data.notifications ?? [], unreadCount: data.unread_count ?? 0, loaded: true });
    } catch (e: any) {
      set({ error: e?.response?.data?.detail ?? "Failed to load notifications" });
    } finally {
      set({ loading: false });
    }
  },
  markRead: async (id) => {
    const prev = get().items;
    const target = prev.find((n) => n.id === id);
    if (!target || target.is_read) return;
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    try {
      await api.post(`/notifications/${id}/read`);
    } catch (e) {
      set({ items: prev, unreadCount: get().unreadCount + 1 });
      throw e;
    }
  },
  markAllRead: async () => {
    const prev = get().items;
    const prevUnread = get().unreadCount;
    set((s) => ({ items: s.items.map((n) => ({ ...n, is_read: true })), unreadCount: 0 }));
    try {
      await api.post("/notifications/read-all");
    } catch (e) {
      set({ items: prev, unreadCount: prevUnread });
      throw e;
    }
  },
  connectRealtime: () => {
    const socket = connectSocket();
    if (listenersBound) return;
    listenersBound = true;
    socket.on("connect", () => set({ connected: true, error: null }));
    socket.on("disconnect", () => set({ connected: false }));
    socket.on("connect_error", (err: Error) => set({ connected: false, error: err?.message ?? "Socket connection failed" }));
    socket.on("notification:new", (payload: NotificationItem) => {
      get().push({ ...payload, is_read: payload.is_read ?? false });
    });
    set({ connected: socket.connected });
  },
  disconnectRealtime: () => {
    const s = getSocket();
    if (s) {
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("notification:new");
    }
    listenersBound = false;
    disconnectSocket();
    set({ connected: false });
  },
}));
