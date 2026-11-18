import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { WsEvent } from "../../../shared/src/index.ts";
import { verifyAccess } from "../auth/tokens.ts";

const rooms = new Map<string, Set<WebSocket>>();

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

export function broadcast(userId: string, event: WsEvent) {
  const sockets = rooms.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}

export function attachWebsocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (socket, request: IncomingMessage) => {
    const token = readCookie(request.headers.cookie, "access_token");
    if (!token) {
      socket.close(4401, "unauthorized");
      return;
    }
    let userId: string;
    try {
      userId = verifyAccess(token).sub;
    } catch {
      socket.close(4401, "unauthorized");
      return;
    }
    let room = rooms.get(userId);
    if (!room) {
      room = new Set();
      rooms.set(userId, room);
    }
    room.add(socket);
    const leave = () => {
      room?.delete(socket);
      if (room && room.size === 0) rooms.delete(userId);
    };
    socket.on("close", leave);
    socket.on("error", () => {
      socket.close();
    });
  });
}
