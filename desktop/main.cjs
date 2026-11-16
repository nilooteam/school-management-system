const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const configPath = () => path.join(app.getPath("userData"), "config.json");
const setupPath = path.join(__dirname, "setup.html");
let mainWindow = null;
let activeOrigin = null;

function normalizeServerUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || "").trim());
  } catch {
    throw new Error("نشانی واردشده معتبر نیست.");
  }

  const isLocal = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error("برای امنیت، نشانی سامانه باید با https شروع شود.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("نشانی نباید شامل نام کاربری یا گذرواژه باشد.");
  }
  return parsed.origin;
}

async function readServerUrl() {
  try {
    const config = JSON.parse(await fs.readFile(configPath(), "utf8"));
    return normalizeServerUrl(config.serverUrl);
  } catch {
    return null;
  }
}

function isSetupSender(event) {
  try {
    const senderUrl = new URL(event.senderFrame.url);
    return senderUrl.protocol === "file:" &&
      path.resolve(fileURLToPath(senderUrl)) === path.resolve(setupPath);
  } catch {
    return false;
  }
}

function isAppSender(event) {
  try {
    return Boolean(activeOrigin) && new URL(event.senderFrame.url).origin === activeOrigin;
  } catch {
    return false;
  }
}

async function showSetup(message = "") {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  activeOrigin = null;
  await mainWindow.loadFile(setupPath);
  if (message) {
    await mainWindow.webContents.executeJavaScript(
      `document.getElementById("error").textContent = ${JSON.stringify(message)};`
    );
  }
}

async function loadBahar() {
  const serverUrl = await readServerUrl();
  if (!serverUrl) {
    await showSetup();
    return false;
  }

  try {
    await mainWindow.loadURL(serverUrl);
    activeOrigin = serverUrl;
    return true;
  } catch {
    await showSetup("اتصال به سامانه برقرار نشد. اینترنت و نشانی سامانه را بررسی کنید.");
    return false;
  }
}

function guardNavigation(event, targetUrl) {
  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    event.preventDefault();
    return;
  }

  if (target.protocol === "file:" && activeOrigin === null) {
    try {
      if (path.resolve(fileURLToPath(target)) === path.resolve(setupPath)) return;
    } catch {}
  }

  if (!activeOrigin || target.origin !== activeOrigin) event.preventDefault();
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
  mainWindow.on("closed", () => {
    mainWindow = null;
    activeOrigin = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === "https:") void shell.openExternal(target.toString());
    } catch {}
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", guardNavigation);
  mainWindow.webContents.on("will-redirect", guardNavigation);
  void loadBahar();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  ipcMain.handle("bahar:save-server-url", async (event, value) => {
    if (!isSetupSender(event)) {
      return { ok: false, error: "درخواست از صفحه مجاز ارسال نشده است." };
    }

    try {
      const serverUrl = normalizeServerUrl(value);
      await fs.mkdir(app.getPath("userData"), { recursive: true });
      await fs.writeFile(
        configPath(),
        JSON.stringify({ serverUrl }, null, 2),
        { mode: 0o600 }
      );

      const connected = await loadBahar();
      if (!connected) {
        return {
          ok: false,
          error: "نشانی ذخیره شد، اما اتصال برقرار نشد. نشانی و اینترنت را بررسی کنید."
        };
      }
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "ذخیره نشانی انجام نشد."
      };
    }
  });

  ipcMain.handle("bahar:open-external", async (event, value) => {
    if (!isAppSender(event)) return false;

    try {
      const url = new URL(String(value));
      if (url.protocol !== "https:") return false;
      await shell.openExternal(url.toString());
      return true;
    } catch {
      return false;
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
