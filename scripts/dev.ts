/**
 * One-command development runner.
 *
 * Starts the authoritative LAN host (tsx watch) and the Vite client with its
 * `/api` and `/ws` proxy pointed at that host. A stable host key is generated
 * for this session so the host console URL can be printed immediately.
 *
 * Run with: npm run dev
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";

const hostPort = process.env.PORT ?? "8787";
const clientPort = process.env.CTD_CLIENT_PORT ?? "5173";
const hostKey = process.env.CTD_HOST_KEY ?? randomBytes(14).toString("base64url");
const proxyTarget = `127.0.0.1:${hostPort}`;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function lanAddress(): string | null {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return null;
}

const children: ChildProcess[] = [];
let shuttingDown = false;

function start(label: string, args: string[]): ChildProcess {
  const child = spawn(npm, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: hostPort,
      CTD_HOST: proxyTarget,
      CTD_HOST_KEY: hostKey,
    },
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`\n[dev] ${label} exited with ${reason}. Shutting down the other process.`);
    void shutdown(code ?? 1);
  });
  child.on("error", (error) => {
    console.error(`[dev] Could not start ${label}:`, error.message);
    void shutdown(1);
  });
  children.push(child);
  return child;
}

async function waitForHost(timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${proxyTarget}/api/health`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return true;
    } catch {
      // Host is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return false;
}

async function shutdown(exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        child.kill("SIGINT");
      } catch {
        // Process may already be gone.
      }
    }
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        child.kill("SIGTERM");
      } catch {
        // Best effort.
      }
    }
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

console.log("[dev] Starting LAN host and Vite client...");
start("LAN host", ["run", "dev:server"]);
start("Vite client", ["run", "dev:client"]);

const ready = await waitForHost();
const lan = lanAddress();
const local = `http://localhost:${clientPort}`;
const network = lan ? `http://${lan}:${clientPort}` : null;

console.log("");
if (ready) {
  console.log("  CyberThreat Defender — development mode");
  console.log(`  Host console: ${local}/#hostKey=${encodeURIComponent(hostKey)}`);
  console.log(`  Guest join:   ${local}`);
  if (network) {
    console.log(`  LAN guest:    ${network}`);
    console.log(`  LAN host:     ${network}/#hostKey=${encodeURIComponent(hostKey)}`);
  }
  console.log("  Host API:     " + `http://${proxyTarget}/api/info`);
  console.log("  Press Ctrl+C to stop both processes.");
} else {
  console.warn(
    `[dev] The host API did not answer at http://${proxyTarget}/api/health within 30 seconds.`,
  );
  console.warn("[dev] Check the host log above. Vite may still be running.");
}
console.log("");
