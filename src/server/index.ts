import { startHost } from "./host.js";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const prefixed = process.argv.find((value) => value.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

const port = Number(argValue("--port") ?? process.env.PORT ?? 8787);
const hostKey = argValue("--host-key") ?? process.env.CTD_HOST_KEY;
const noDiscovery = process.argv.includes("--no-discovery");

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error("Invalid --port. Use a number between 0 and 65535.");
  process.exit(1);
}

try {
  const host = await startHost({
    port,
    hostKey,
    enableMdns: !noDiscovery,
    enableUdp: !noDiscovery,
  });
  const shutdown = async () => {
    console.log("\nShutting down the LAN host...");
    await host.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
} catch (error) {
  console.error("Could not start the LAN host:", error instanceof Error ? error.message : error);
  process.exit(1);
}
