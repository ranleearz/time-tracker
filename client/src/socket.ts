import { isWsEvent, type WsEvent } from "@tracker/shared";

export function connectSocket(onEvent: (event: WsEvent) => void, onUnauthorized: () => Promise<boolean>) {
  let socket: WebSocket | null = null;
  let stopped = false;
  let attempt = 0;
  let timer = 0;

  const open = () => {
    if (stopped) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socket.onmessage = (message) => {
      try {
        const parsed: unknown = JSON.parse(String(message.data));
        if (isWsEvent(parsed)) onEvent(parsed);
      } catch {
        return;
      }
    };
    socket.onopen = () => {
      attempt = 0;
    };
    socket.onclose = (event) => {
      if (stopped) return;
      if (event.code === 4401) {
        void onUnauthorized().then((ok) => {
          if (ok && !stopped) open();
        });
        return;
      }
      attempt += 1;
      const delay = Math.min(10_000, 500 * attempt);
      timer = window.setTimeout(open, delay);
    };
  };

  open();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    socket?.close();
  };
}
