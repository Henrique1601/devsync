const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('devsyncDesktop', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  startupEnabled: () => ipcRenderer.invoke('startup-get'),
  setStartup: enabled => ipcRenderer.invoke('startup-set', enabled),
  updateState: () => ipcRenderer.invoke('updates-get'),
  configureUpdates: settings => ipcRenderer.invoke('updates-configure', settings),
  checkUpdates: () => ipcRenderer.invoke('updates-check'),
  downloadUpdate: () => ipcRenderer.invoke('updates-download'),
  installUpdate: () => ipcRenderer.invoke('updates-install')
});
