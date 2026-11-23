import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketOrigin(): string {
  const api = (import.meta.env.VITE_API_URL as string | undefined) || "https://api.kenikoolsalon.com/api/v1";
  try {
    const u = new URL(api);
    return u.origin;
  } catch {
    return "https://api.kenikoolsalon.com";
  }
}

export function connectSocket(): Socket {
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

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
