import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";
import { startHost, type HostHandle } from "../server/host.js";

let host: HostHandle | null = null;

function createWindow(url: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1020,
    minHeight: 700,
    backgroundColor: "#03090d",
    title: "CyberThreat Defender: LAN FFA & Teams",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      void shell.openExternal(target);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, target) => {
    if (!target.startsWith(url)) event.preventDefault();
  });
  void window.loadURL(url);
  return window;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  void app.whenReady().then(async () => {
    try {
      host = await startHost({
        port: 0,
        hostKey: randomBytes(16).toString("base64url"),
        clientDir: join(app.getAppPath(), "dist", "client"),
        enableMdns: true,
        enableUdp: true,
        quiet: true,
      });
      const window = createWindow(
        `${host.url}/#hostKey=${encodeURIComponent(host.hostKey)}&desktop=1`,
      );
      window.setTitle("CyberThreat Defender: LAN FFA & Teams");
    } catch (error) {
      dialog.showErrorBox(
        "Could not start CyberThreat Defender",
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && host) {
      createWindow(`${host.url}/#hostKey=${encodeURIComponent(host.hostKey)}&desktop=1`);
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", (event) => {
    if (!host) return;
    event.preventDefault();
    const closing = host;
    host = null;
    void closing.close().finally(() => app.quit());
  });
}
