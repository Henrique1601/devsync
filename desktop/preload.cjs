const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('devsyncDesktop', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  startupEnabled: () => ipcRenderer.invoke('startup-get'),
  setStartup: enabled => ipcRenderer.invoke('startup-set', enabled)
});
