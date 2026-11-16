const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("baharDesktop", Object.freeze({
  saveServerUrl: (url) => ipcRenderer.invoke("bahar:save-server-url", url),
  openExternal: (url) => ipcRenderer.invoke("bahar:open-external", url)
}));
