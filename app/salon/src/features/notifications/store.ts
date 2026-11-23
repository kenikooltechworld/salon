import { create } from "zustand";
import { api } from "@/lib/api";
import { acquireSocket, releaseSocket } from "@/lib/socket";

export type NotificationCategory = "all" | "services" | "appointments" | "commissions" | "system";
export type NotificationStatusFilter = "all" | "unread" | "read";

export interface NotificationItem {
  id: string;
  notification_type: string;
  title?: string | null;
  content: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFilters {
  status: NotificationStatusFilter;
  category: NotificationCategory;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  loaded: boolean;
  loading: boolean;
  loadingMore: boolean;
  connected: boolean;
  error: string | null;
  filters: NotificationFilters;
  load: (opts?: { reset?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: Partial<NotificationFilters>) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  push: (n: NotificationItem) => void;
}

let listenersBound = false;

export function matchesFilters(n: NotificationItem, filters: NotificationFilters): boolean {
  if (filters.status === "unread" && n.is_read) return false;
  if (filters.status === "read" && !n.is_read) return false;
  if (filters.category === "all") return true;
  const t = n.notification_type || "";
  if (filters.category === "services") return t.startsWith("service");
  if (filters.category === "appointments") return t.startsWith("appointment");
  if (filters.category === "commissions") return t.startsWith("commission");
  return !t.startsWith("service") && !t.startsWith("appointment") && !t.startsWith("commission");
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  pageSize: 20,
  hasMore: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  connected: false,
  error: null,
  filters: { status: "all", category: "all" },

  push: (n) =>
    set((s) => {
      const exists = s.items.some((x) => x.id === n.id);
      const unreadCount = s.unreadCount + (n.is_read ? 0 : 1);
      if (exists) return { ...s, unreadCount };
      if (!matchesFilters(n, s.filters)) return { ...s, unreadCount };
      return {
        items: [n, ...s.items].slice(0, 100),
        unreadCount,
        total: s.total + 1,
      };
    }),

  load: async (opts) => {
    const reset = opts?.reset ?? !get().loaded;
    const state = get();
    if (state.loading || state.loadingMore) return;
    const page = reset ? 1 : state.page;
    set({ loading: reset, loadingMore: !reset, error: null });
    try {
      const { filters, pageSize } = get();
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (filters.status === "unread") params.is_read = false;
      if (filters.status === "read") params.is_read = true;
      if (filters.category !== "all") params.category = filters.category;
      const { data } = await api.get("/notifications", { params });
      const nextItems: NotificationItem[] = data.notifications ?? [];
      set((s) => {
        const merged = reset ? nextItems : [...s.items, ...nextItems.filter((n) => !s.items.some((x) => x.id === n.id))];
        const total = data.total ?? merged.length;
        return {
          items: merged,
          unreadCount: data.unread_count ?? s.unreadCount,
          total,
          page,
          hasMore: merged.length < total,
          loaded: true,
        };
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.detail ?? "Failed to load notifications" });
    } finally {
      set({ loading: false, loadingMore: false });
    }
  },

  loadMore: async () => {
    const s = get();
    if (s.loading || s.loadingMore || !s.hasMore) return;
    set({ page: s.page + 1 });
    await get().load({ reset: false });
  },

  setFilters: (partial) => {
    set((s) => ({ filters: { ...s.filters, ...partial }, page: 1, hasMore: false }));
    void get().load({ reset: true });
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
    const socket = acquireSocket();
    if (listenersBound) {
      set({ connected: socket.connected });
      return;
    }
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
    listenersBound = false;
    releaseSocket();
    set({ connected: false });
  },
}));
