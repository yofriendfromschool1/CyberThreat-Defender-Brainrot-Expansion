import type {
  ClientMessage,
  ClientRole,
  LobbySnapshot,
  LogEntry,
  ServerMessage,
} from "../shared/types.js";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface ConnectOptions {
  server: string;
  name: string;
  role: ClientRole;
  hostKey?: string;
}

export interface NetHandlers {
  onJoined?: (message: Extract<ServerMessage, { type: "joined" }>) => void;
  onLobby?: (lobby: LobbySnapshot) => void;
  onGame?: (message: Extract<ServerMessage, { type: "game" }>) => void;
  onChat?: (message: LogEntry) => void;
  onError?: (code: string, message: string) => void;
  onNotice?: (message: string, tone?: "info" | "warn" | "success") => void;
  onKicked?: (reason: string) => void;
  onLeft?: () => void;
  onStatus?: (status: ConnectionStatus) => void;
  onLatency?: (milliseconds: number) => void;
}

const MAX_RECONNECT_ATTEMPTS = 6;

export function normalizeSocketUrl(input: string): string {
  let raw = input.trim();
  if (!raw) throw new Error("Enter a host address.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `ws://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That host address is not valid.");
  }
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("Use a ws://, wss://, http:// or https:// address.");
  }
  if (!url.pathname || url.pathname === "/") {
    url.pathname = "/ws";
  } else if (!url.pathname.endsWith("/ws")) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  }
  url.hash = "";
  url.search = "";
  return url.toString();
}

export function currentSocketUrl(): string {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/ws`;
}

export function currentServerAddress(): string {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.host;
  }
  return "127.0.0.1:8787";
}

function tokenKey(endpoint: string): string {
  return `ctd.lan.token.${endpoint}`;
}

export class LanClient {
  private socket: WebSocket | null = null;
  private handlers: NetHandlers;
  private endpoint = "";
  private options: ConnectOptions | null = null;
  private token = "";
  private joined = false;
  private intentional = false;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private joinTimeout: number | null = null;
  private pendingConnect: {
    resolve: (message: Extract<ServerMessage, { type: "joined" }>) => void;
    reject: (error: Error) => void;
  } | null = null;
  private status: ConnectionStatus = "idle";

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.handlers.onStatus?.(status);
  }

  connect(options: ConnectOptions): Promise<Extract<ServerMessage, { type: "joined" }>> {
    this.disposeSocket();
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.options = {
      ...options,
      name: options.name.trim().slice(0, 24) || "Player",
    };
    this.endpoint = normalizeSocketUrl(options.server);
    this.token = localStorage.getItem(tokenKey(this.endpoint)) ?? "";
    this.intentional = false;
    this.joined = false;
    this.reconnectAttempts = 0;
    this.setStatus("connecting");
    return new Promise((resolve, reject) => {
      this.pendingConnect = { resolve, reject };
      this.openSocket();
      this.joinTimeout = window.setTimeout(() => {
        if (this.joined) return;
        this.pendingConnect?.reject(new Error("The host did not answer in time."));
        this.pendingConnect = null;
        this.intentional = true;
        this.socket?.close();
        this.setStatus("error");
      }, 12_000);
    });
  }

  private openSocket(): void {
    if (!this.options) return;
    const socket = new WebSocket(this.endpoint);
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket) return;
      const message: Extract<ClientMessage, { type: "join" }> = {
        type: "join",
        name: this.options!.name,
        role: this.options!.role,
        hostKey: this.options!.hostKey || undefined,
        reconnectToken: this.token || undefined,
      };
      socket.send(JSON.stringify(message));
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      this.handleMessage(message);
    };
    socket.onerror = () => {
      // The close event carries the recoverable path.
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.stopPing();
      if (this.intentional) {
        this.setStatus("disconnected");
        return;
      }
      if (this.pendingConnect && !this.joined) {
        if (this.reconnectAttempts === 0 && event.code === 1006) {
          // Allow one immediate retry for servers that are still binding.
        }
      }
      if (event.code === 1000 || event.code === 1001) {
        if (!this.joined) this.failPending(new Error(event.reason || "The host closed the connection."));
        this.setStatus("disconnected");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "joined": {
        this.joined = true;
        this.reconnectAttempts = 0;
        this.token = message.reconnectToken;
        localStorage.setItem(tokenKey(this.endpoint), message.reconnectToken);
        if (this.joinTimeout) window.clearTimeout(this.joinTimeout);
        this.joinTimeout = null;
        this.setStatus("connected");
        this.startPing();
        this.handlers.onJoined?.(message);
        this.pendingConnect?.resolve(message);
        this.pendingConnect = null;
        return;
      }
      case "lobby":
        this.handlers.onLobby?.(message.lobby);
        return;
      case "game":
        this.handlers.onGame?.(message);
        return;
      case "chat":
        this.handlers.onChat?.(message.message);
        return;
      case "error": {
        this.handlers.onError?.(message.code, message.message);
        if (!this.joined) {
          this.failPending(new Error(message.message));
          this.intentional = true;
          this.socket?.close();
          this.setStatus("error");
        }
        return;
      }
      case "notice":
        this.handlers.onNotice?.(message.message, message.tone);
        return;
      case "kicked":
        this.intentional = true;
        localStorage.removeItem(tokenKey(this.endpoint));
        this.handlers.onKicked?.(message.reason);
        this.setStatus("disconnected");
        return;
      case "left":
        this.intentional = true;
        localStorage.removeItem(tokenKey(this.endpoint));
        this.handlers.onLeft?.();
        this.setStatus("disconnected");
        return;
      case "pong":
        this.handlers.onLatency?.(Math.max(0, Math.round(Date.now() - message.t)));
        return;
      default:
        return;
    }
  }

  private failPending(error: Error): void {
    if (this.joinTimeout) window.clearTimeout(this.joinTimeout);
    this.joinTimeout = null;
    this.pendingConnect?.reject(error);
    this.pendingConnect = null;
  }

  private scheduleReconnect(): void {
    if (!this.options || this.intentional) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus("error");
      this.failPending(new Error("Lost connection to the host. Retry when the host is back."));
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(5_000, 700 * this.reconnectAttempts);
    this.setStatus("reconnecting");
    this.reconnectTimer = window.setTimeout(() => {
      if (this.intentional) return;
      this.openSocket();
    }, delay);
  }

  retry(): void {
    if (!this.options) return;
    this.intentional = false;
    this.reconnectAttempts = 0;
    this.setStatus("reconnecting");
    this.openSocket();
  }

  send(message: ClientMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.joined) return false;
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  leave(): void {
    this.intentional = true;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "leave" } satisfies ClientMessage));
      window.setTimeout(() => this.disconnect(), 80);
    } else {
      this.disconnect();
    }
  }

  disconnect(): void {
    this.intentional = true;
    this.joined = false;
    this.stopPing();
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.joinTimeout) window.clearTimeout(this.joinTimeout);
    this.joinTimeout = null;
    this.disposeSocket();
    this.setStatus("disconnected");
    this.pendingConnect = null;
  }

  private disposeSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = window.setInterval(() => {
      this.send({ type: "ping", t: Date.now() });
    }, 7_000);
  }

  private stopPing(): void {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}
