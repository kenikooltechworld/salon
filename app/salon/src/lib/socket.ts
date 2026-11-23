import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketOrigin(): string {
  const api = (import.meta.env.VITE_API_URL as string | undefined) || "https://api.kenikoolsalon.com/api/v1";
  // strip /api/v1 or any path
  try {
    const u = new URL(api);
    return u.origin;
  } catch {
    return "https://api.kenikoolsalon.com";
  }
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }
  socket = io(getSocketOrigin(), {
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
