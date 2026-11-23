import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let refs = 0;

function getSocketOrigin(): string {
  const api = (import.meta.env.VITE_API_URL as string | undefined) || "https://api.kenikoolsalon.com/api/v1";
  try {
    const u = new URL(api);
    return u.origin;
  } catch {
    return "https://api.kenikoolsalon.com";
  }
}

export function acquireSocket(): Socket {
  refs += 1;
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(getSocketOrigin(), {
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });
  return socket;
}

export function releaseSocket(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
