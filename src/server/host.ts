import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { CLIENT_VERSION, GameRuleError, type GameSettings, type ServerMessage } from "../shared/types.js";
import { ALL_CARDS } from "../shared/cards/index.js";
import { DiscoveryService } from "./discovery.js";
import { Lobby, type LobbySocket } from "./lobby.js";

export interface HostOptions {
  port?: number;
  hostKey?: string;
  settings?: Partial<GameSettings>;
  clientDir?: string;
  enableMdns?: boolean;
  enableUdp?: boolean;
  discoveryPort?: number;
  quiet?: boolean;
}

export interface HostHandle {
  port: number;
  url: string;
  hostKey: string;
  serverId: string;
  lobby: Lobby;
  discovery: DiscoveryService;
  close(): Promise<void>;
}

function lanAddresses(): string[] {
  const results = new Set<string>(["127.0.0.1"]);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) results.add(entry.address);
    }
  }
  return [...results];
}

function moduleDirectory(): string | null {
  try {
    if (typeof __dirname === "string" && __dirname) return __dirname;
  } catch {
    // CJS bundles inject __dirname; ESM builds do not.
  }
  try {
    const meta = import.meta as ImportMeta & { url?: string };
    if (meta.url) return dirname(fileURLToPath(meta.url));
  } catch {
    // A CJS bundle has no import.meta.url.
  }
  return null;
}

function findClientDir(explicit?: string): string | null {
  const isClientDir = (candidate: string | undefined): candidate is string =>
    Boolean(candidate && existsSync(join(candidate, "index.html")));
  if (isClientDir(explicit)) return explicit;
  const cwdCandidate = join(process.cwd(), "dist", "client");
  if (isClientDir(cwdCandidate)) return cwdCandidate;
  const dir = moduleDirectory();
  if (!dir) return null;
  const candidates = [
    resolve(dir, "..", "client"),
    resolve(dir, "..", "..", "dist", "client"),
  ];
  return candidates.find(isClientDir) ?? null;
}

function listen(server: HttpServer, port: number): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Server did not expose a TCP address."));
        return;
      }
      resolvePort(address.port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "0.0.0.0");
  });
}

export async function startHost(options: HostOptions = {}): Promise<HostHandle> {
  const hostKey = options.hostKey ?? randomBytes(14).toString("base64url");
  const serverId = randomUUID();
  const lobby = new Lobby({ hostKey, settings: options.settings });
  const app = express();
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (request.path.startsWith("/api/")) {
      response.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));

  const addresses = lanAddresses();

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, version: CLIENT_VERSION, noPlayerCap: true });
  });

  app.get("/api/info", (_request, response) => {
    response.json({
      id: serverId,
      name: lobby.snapshot().discoveryName,
      hostName: lobby.hostName,
      version: CLIENT_VERSION,
      port: actualPort,
      addresses,
      startedAt: startedAt,
      hostKeyRequired: true,
      noPlayerCap: true,
    });
  });

  app.get("/api/lobby", (_request, response) => {
    response.json(lobby.snapshot());
  });

  app.get("/api/cards", (_request, response) => {
    response.json({ cards: ALL_CARDS });
  });

  app.get("/api/discover", async (_request, response) => {
    const local = lobby.snapshot();
    const record = {
      id: serverId,
      name: local.settings.lobbyName,
      hostName: local.hostName,
      host: addresses.find((address) => address !== "127.0.0.1") ?? "127.0.0.1",
      port: actualPort,
      players: local.players.length,
      phase: local.phase,
      version: CLIENT_VERSION,
      source: "local" as const,
    };
    try {
      const remote = await discovery.scan();
      response.json([record, ...remote.filter((entry) => entry.id !== serverId)]);
    } catch {
      response.json([record]);
    }
  });

  const clientDir = findClientDir(options.clientDir);
  if (clientDir) {
    app.use(
      express.static(clientDir, {
        index: false,
        maxAge: "1h",
        setHeaders(response, filePath) {
          if (filePath.includes(`${join(clientDir, "art")}`) || filePath.includes(`${join(clientDir, "assets")}`)) {
            response.setHeader("Cache-Control", "public, max-age=2592000, immutable");
          }
        },
      }),
    );
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api/") || request.path === "/ws") {
        next();
        return;
      }
      if (!request.accepts("html")) {
        next();
        return;
      }
      response.sendFile(join(clientDir, "index.html"));
    });
  } else {
    app.get("/", (_request, response) => {
      response.status(200).json({
        name: "CyberThreat Defender: LAN FFA & Teams",
        message: "The client bundle is not built. Run npm run build, or use npm run dev for Vite.",
        api: "/api/info",
      });
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: "Not found" });
  });

  const server = createHttpServer(app);
  const actualPort = await listen(server, options.port ?? 8787);
  const startedAt = Date.now();
  const url = `http://127.0.0.1:${actualPort}`;

  const wss = new WebSocketServer({ noServer: true, maxPayload: 96 * 1024 });
  server.on("upgrade", (request, socket, head) => {
    const pathname = (() => {
      try {
        return new URL(request.url ?? "/", "http://localhost").pathname;
      } catch {
        return "";
      }
    })();
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, request);
    });
  });

  const connectionIds = new Map<WebSocket, string>();
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on("connection", (websocket) => {
    const connectionId = randomUUID();
    connectionIds.set(websocket, connectionId);
    alive.set(websocket, true);
    let joined = false;
    let messageWindow = 0;
    let messageWindowStart = Date.now();

    const sendToSocket = (message: ServerMessage) => {
      if (websocket.readyState !== WebSocket.OPEN) return;
      try {
        websocket.send(JSON.stringify(message));
      } catch {
        // The close handler will clean up.
      }
    };

    const socketAdapter: LobbySocket = {
      id: connectionId,
      send: sendToSocket,
      close: (reason: string) => {
        try {
          websocket.close(1000, reason.slice(0, 100));
        } catch {
          websocket.terminate();
        }
      },
    };

    websocket.on("pong", () => alive.set(websocket, true));
    websocket.on("message", (raw) => {
      const now = Date.now();
      if (now - messageWindowStart > 1000) {
        messageWindow = 0;
        messageWindowStart = now;
      }
      messageWindow += 1;
      if (messageWindow > 120) {
        sendToSocket({ type: "error", code: "rate-limit", message: "Too many messages. Slow down." });
        return;
      }
      let message: { type?: unknown; [key: string]: unknown };
      try {
        message = JSON.parse(raw.toString()) as typeof message;
      } catch {
        sendToSocket({ type: "error", code: "bad-json", message: "Messages must be valid JSON." });
        return;
      }
      if (!message || typeof message !== "object" || typeof message.type !== "string") {
        sendToSocket({ type: "error", code: "bad-message", message: "A message type is required." });
        return;
      }
      try {
        if (message.type === "join") {
          if (joined) {
            sendToSocket({ type: "error", code: "already-joined", message: "This connection already joined." });
            return;
          }
          lobby.join(socketAdapter, message as import("../shared/types.js").ClientMessageMap["join"]);
          joined = true;
          return;
        }
        lobby.handle(connectionId, { ...message, type: String(message.type) });
      } catch (error) {
        if (error instanceof GameRuleError) {
          sendToSocket({ type: "error", code: error.code, message: error.message });
        } else {
          console.error("[ws] Unhandled command error:", error);
          sendToSocket({ type: "error", code: "internal", message: "The host could not process that action." });
        }
      }
    });

    websocket.on("close", () => {
      connectionIds.delete(websocket);
      lobby.disconnect(connectionId);
    });
    websocket.on("error", (error) => {
      console.warn("[ws] Socket error:", error.message);
    });
  });

  const heartbeat = setInterval(() => {
    for (const websocket of wss.clients) {
      if (alive.get(websocket) === false) {
        websocket.terminate();
        continue;
      }
      alive.set(websocket, false);
      try {
        websocket.ping();
      } catch {
        // ignore
      }
    }
  }, 30_000);
  heartbeat.unref?.();

  const discovery = new DiscoveryService({
    getRecord: () => ({
      info: {
        id: serverId,
        name: lobby.snapshot().discoveryName,
        hostName: lobby.hostName,
        version: CLIENT_VERSION,
        port: actualPort,
        addresses,
        startedAt,
        hostKeyRequired: true,
        noPlayerCap: true,
      },
      lobby: lobby.snapshot(),
    }),
    discoveryPort: options.discoveryPort,
    enableMdns: options.enableMdns,
    enableUdp: options.enableUdp,
  });
  await discovery.start();

  const ticker = setInterval(() => {
    try {
      lobby.tick();
    } catch (error) {
      console.error("[lobby] Tick failed:", error);
    }
  }, 450);
  ticker.unref?.();

  if (!options.quiet) {
    console.log("");
    console.log("  CyberThreat Defender: LAN FFA & Teams");
    console.log(`  Host console: ${url}/#hostKey=${encodeURIComponent(hostKey)}`);
    console.log(`  Guest join:   ${url}`);
    console.log(`  LAN join:     http://<your-ip>:${actualPort}`);
    console.log("  No player cap. mDNS + UDP discovery enabled.");
    console.log("");
  }

  return {
    port: actualPort,
    url,
    hostKey,
    serverId,
    lobby,
    discovery,
    async close() {
      clearInterval(ticker);
      clearInterval(heartbeat);
      for (const client of wss.clients) {
        try {
          client.close(1001, "Host shutting down");
        } catch {
          client.terminate();
        }
      }
      await new Promise<void>((resolveClose) => wss.close(() => resolveClose()));
      await discovery.stop();
      await new Promise<void>((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
      });
    },
  };
}
