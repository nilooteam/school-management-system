const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const CONFIG_PATH = () => path.join(app.getPath("userData"), "config.json");
let mainWindow;

function normalizeServerUrl(value) {
  let parsed;
  try { parsed = new URL(String(value || "").trim()); } catch { throw new Error("نشانی واردشده معتبر نیست."); }
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new Error("برای امنیت، نشانی سامانه باید با https شروع شود.");
  }
  if (parsed.username || parsed.password) throw new Error("نشانی نباید شامل نام کاربری یا گذرواژه باشد.");
  return parsed.origin;
}

async function readServerUrl() {
  try {
    const config = JSON.parse(await fs.readFile(CONFIG_PATH(), "utf8"));
    return normalizeServerUrl(config.serverUrl);
  } catch { return null; }
}

async function showSetup(message = "") {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  await mainWindow.loadFile(path.join(__dirname, "setup.html"));
  if (message) mainWindow.webContents.send("setup-error", message);
}

async function loadBahar() {
  const serverUrl = await readServerUrl();
  if (!serverUrl) return showSetup();
  try {
    await mainWindow.loadURL(serverUrl);
  } catch {
    await showSetup("اتصال به سامانه برقرار نشد. نشانی اینترنت و آدرس سامانه را بررسی کنید.");
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === "https:") shell.openExternal(target.toString());
    } catch {}
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", async (event, targetUrl) => {
    let current;
    try { current = new URL(targetUrl); } catch { event.preventDefault(); return; }
    if (current.protocol === "file:") return;
    const allowed = await readServerUrl();
    if (!allowed || current.origin !== allowed) event.preventDefault();
  });
  loadBahar();
}

ipcMain.handle("bahar:save-server-url", async (_event, value) => {
  try {
    const serverUrl = normalizeServerUrl(value);
    await fs.mkdir(app.getPath("userData"), { recursive: true });
    await fs.writeFile(CONFIG_PATH(), JSON.stringify({ serverUrl }, null, 2), { mode: 0o600 });
    await loadBahar();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ذخیره نشانی انجام نشد." };
  }
});

ipcMain.handle("bahar:open-external", async (_event, value) => {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:") return false;
    await shell.openExternal(url.toString());
    return true;
  } catch { return false; }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
