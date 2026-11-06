import { createSocket, type Socket as UdpSocket, type RemoteInfo } from "node:dgram";
import { networkInterfaces } from "node:os";
import { Bonjour, type Service } from "bonjour-service";
import type { DiscoveryLobby, LobbyPhase, LobbySnapshot, ServerInfo } from "../shared/types.js";

export interface DiscoveryRecordInput {
  info: ServerInfo;
  lobby: LobbySnapshot;
}

export interface DiscoveryServiceOptions {
  getRecord: () => DiscoveryRecordInput;
  discoveryPort?: number;
  enableMdns?: boolean;
  enableUdp?: boolean;
}

const DISCOVERY_TYPE = "cyberthreat";
const DISCOVERY_PROBE = "CTD_DISCOVER_V1";
const DEFAULT_DISCOVERY_PORT = 41234;

interface UdpBeacon {
  type: "ctd-lobby";
  v: 1;
  record: DiscoveryLobby;
}

function safeString(value: unknown, max = 80): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function localAddresses(): Array<{ address: string; netmask: string }> {
  const interfaces = networkInterfaces();
  const results: Array<{ address: string; netmask: string }> = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal && entry.address) {
        results.push({ address: entry.address, netmask: entry.netmask });
      }
    }
  }
  return results;
}

function broadcastFor(address: string, netmask: string): string | null {
  const addressParts = address.split(".").map(Number);
  const maskParts = netmask.split(".").map(Number);
  if (addressParts.length !== 4 || maskParts.length !== 4 || [...addressParts, ...maskParts].some((part) => Number.isNaN(part))) {
    return null;
  }
  return addressParts
    .map((part, index) => ((part & maskParts[index]!) | (~maskParts[index]! & 255)) & 255)
    .join(".");
}

function phaseFrom(value: unknown): LobbyPhase {
  return value === "drafting" || value === "playing" || value === "ended" ? value : "lobby";
}

function toDiscoveryLobby(
  record: { name?: unknown; hostName?: unknown; id?: unknown; host?: unknown; port?: unknown; players?: unknown; phase?: unknown; version?: unknown },
  source: DiscoveryLobby["source"],
  fallbackHost: string,
): DiscoveryLobby | null {
  const id = safeString(record.id, 80);
  const name = safeString(record.name, 80);
  const host = safeString(record.host, 120) || fallbackHost;
  const port = Number(record.port);
  if (!id || !name || !host || !Number.isInteger(port) || port <= 0 || port > 65535) return null;
  const playersValue = Number(record.players);
  return {
    id,
    name,
    hostName: safeString(record.hostName, 40) || "Host",
    host,
    port,
    players: Number.isFinite(playersValue) ? Math.max(0, Math.round(playersValue)) : 0,
    phase: phaseFrom(record.phase),
    version: safeString(record.version, 20) || "1.0.0",
    source,
  };
}

export class DiscoveryService {
  private readonly options: DiscoveryServiceOptions;
  private readonly port: number;
  private udp: UdpSocket | null = null;
  private bonjour: Bonjour | null = null;
  private service: Service | null = null;
  private publishedName = "";
  private refreshTimer: NodeJS.Timeout | null = null;
  private scanCache: { at: number; records: DiscoveryLobby[] } | null = null;
  private scanning: Promise<DiscoveryLobby[]> | null = null;

  constructor(options: DiscoveryServiceOptions) {
    this.options = options;
    this.port = options.discoveryPort ?? DEFAULT_DISCOVERY_PORT;
  }

  async start(): Promise<void> {
    if (this.options.enableMdns !== false) this.startMdns();
    if (this.options.enableUdp !== false) this.startUdp();
    this.refreshTimer = setInterval(() => this.refreshAdvertisement(), 7_000);
    this.refreshTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    this.udp?.close();
    this.udp = null;
    if (this.bonjour) {
      try {
        await new Promise<void>((resolve) => this.bonjour?.unpublishAll(() => resolve()));
        this.bonjour?.destroy();
      } catch {
        // mDNS is best-effort.
      }
    }
    this.bonjour = null;
    this.service = null;
  }

  private startMdns(): void {
    try {
      this.bonjour = new Bonjour();
      this.publishMdns();
    } catch (error) {
      console.warn("[discovery] mDNS unavailable:", error);
      this.bonjour = null;
    }
  }

  private publishMdns(): void {
    if (!this.bonjour) return;
    const { info, lobby } = this.options.getRecord();
    const serviceName = `${lobby.settings.lobbyName} (${info.id.slice(0, 4)})`;
    try {
      this.service?.stop();
      this.service = this.bonjour.publish({
        name: serviceName,
        type: DISCOVERY_TYPE,
        protocol: "tcp",
        port: info.port,
        txt: {
          id: info.id,
          name: lobby.settings.lobbyName,
          hostName: lobby.hostName,
          host: info.addresses[0] ?? "127.0.0.1",
          port: String(info.port),
          players: String(lobby.players.length),
          phase: lobby.phase,
          version: info.version,
        },
      });
      this.publishedName = serviceName;
    } catch (error) {
      console.warn("[discovery] Could not publish mDNS service:", error);
    }
  }

  private refreshAdvertisement(): void {
    if (!this.bonjour) return;
    const { info, lobby } = this.options.getRecord();
    const serviceName = `${lobby.settings.lobbyName} (${info.id.slice(0, 4)})`;
    if (serviceName !== this.publishedName) this.publishMdns();
    else if (this.service) {
      this.service.txt = {
        ...this.service.txt,
        players: String(lobby.players.length),
        phase: lobby.phase,
        hostName: lobby.hostName,
      } as unknown as Record<string, string>;
    }
  }

  private startUdp(): void {
    try {
      const socket = createSocket({ type: "udp4", reuseAddr: true });
      this.udp = socket;
      socket.on("message", (message, remote) => this.onUdpMessage(message, remote));
      socket.on("error", (error) => {
        console.warn("[discovery] UDP unavailable:", error.message);
        if (this.udp === socket) {
          this.udp = null;
          try {
            socket.close();
          } catch {
            // already closed
          }
        }
      });
      socket.bind(this.port, () => {
        try {
          socket.setBroadcast(true);
        } catch {
          // Some platforms disallow broadcast; direct-IP still works.
        }
      });
    } catch (error) {
      console.warn("[discovery] UDP unavailable:", error);
      this.udp = null;
    }
  }

  private onUdpMessage(message: Buffer, remote: RemoteInfo): void {
    const text = message.toString("utf8", 0, Math.min(message.length, 1024));
    if (!text.includes(DISCOVERY_PROBE) && !text.includes("ctd-discover")) return;
    const { info, lobby } = this.options.getRecord();
    const record: DiscoveryLobby | null = toDiscoveryLobby(
      {
        id: info.id,
        name: lobby.settings.lobbyName,
        hostName: lobby.hostName,
        host: info.addresses[0] ?? remote.address,
        port: info.port,
        players: lobby.players.length,
        phase: lobby.phase,
        version: info.version,
      },
      "udp",
      remote.address,
    );
    if (!record || !this.udp) return;
    const payload: UdpBeacon = { type: "ctd-lobby", v: 1, record };
    try {
      this.udp.send(Buffer.from(JSON.stringify(payload)), remote.port, remote.address);
    } catch {
      // Best-effort.
    }
  }

  async scan(): Promise<DiscoveryLobby[]> {
    if (this.scanCache && Date.now() - this.scanCache.at < 2_500) {
      return this.scanCache.records;
    }
    if (this.scanning) return this.scanning;
    this.scanning = this.performScan().finally(() => {
      this.scanning = null;
    });
    const records = await this.scanning;
    this.scanCache = { at: Date.now(), records };
    return records;
  }

  private async performScan(): Promise<DiscoveryLobby[]> {
    const tasks: Array<Promise<DiscoveryLobby[]>> = [];
    if (this.options.enableUdp !== false) tasks.push(this.scanUdp());
    if (this.options.enableMdns !== false && this.bonjour) tasks.push(this.scanMdns());
    const results = await Promise.allSettled(tasks);
    const byId = new Map<string, DiscoveryLobby>();
    const ownId = this.options.getRecord().info.id;
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const record of result.value) {
        if (record.id === ownId) continue;
        byId.set(record.id, record);
      }
    }
    return [...byId.values()];
  }

  private scanUdp(): Promise<DiscoveryLobby[]> {
    return new Promise((resolve) => {
      const found = new Map<string, DiscoveryLobby>();
      const socket = createSocket({ type: "udp4" });
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        try {
          socket.close();
        } catch {
          // already closed
        }
        resolve([...found.values()]);
      };
      socket.on("message", (message, remote) => {
        if (message.length > 4096) return;
        try {
          const parsed = JSON.parse(message.toString("utf8")) as Partial<UdpBeacon>;
          if (parsed.type !== "ctd-lobby" || parsed.v !== 1 || !parsed.record) return;
          const record = toDiscoveryLobby(parsed.record, "udp", remote.address);
          if (record) found.set(record.id, record);
        } catch {
          // Ignore unrelated broadcast traffic.
        }
      });
      socket.on("error", finish);
      socket.bind(0, () => {
        try {
          socket.setBroadcast(true);
        } catch {
          // ignore
        }
        const targets = new Set<string>(["255.255.255.255", "127.0.0.1"]);
        for (const { address, netmask } of localAddresses()) {
          const broadcast = broadcastFor(address, netmask);
          if (broadcast) targets.add(broadcast);
        }
        for (const target of targets) {
          try {
            socket.send(Buffer.from(DISCOVERY_PROBE), this.port, target);
          } catch {
            // Ignore individual network failures.
          }
        }
        setTimeout(finish, 750).unref?.();
      });
    });
  }

  private scanMdns(): Promise<DiscoveryLobby[]> {
    return new Promise((resolve) => {
      if (!this.bonjour) {
        resolve([]);
        return;
      }
      const found = new Map<string, DiscoveryLobby>();
      let browser: ReturnType<Bonjour["find"]>;
      try {
        browser = this.bonjour.find({ type: DISCOVERY_TYPE, protocol: "tcp" });
      } catch {
        resolve([]);
        return;
      }
      const onUp = (service: Service) => {
        const txt = (service.txt ?? {}) as Record<string, unknown>;
        const address =
          service.addresses?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ??
          service.referer?.address ??
          "";
        const record = toDiscoveryLobby(
          {
            id: txt.id,
            name: txt.name ?? service.name,
            hostName: txt.hostName,
            host: address || txt.host,
            port: service.port,
            players: txt.players,
            phase: txt.phase,
            version: txt.version,
          },
          "mdns",
          address,
        );
        if (record) found.set(record.id, record);
      };
      browser.on("up", onUp);
      setTimeout(() => {
        try {
          browser.stop();
        } catch {
          // ignore
        }
        resolve([...found.values()]);
      }, 850).unref?.();
    });
  }
}
