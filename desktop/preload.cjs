const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('devsyncDesktop', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  startupEnabled: () => ipcRenderer.invoke('startup-get'),
  setStartup: enabled => ipcRenderer.invoke('startup-set', enabled),
  updateState: () => ipcRenderer.invoke('updates-get'),
  configureUpdates: settings => ipcRenderer.invoke('updates-configure', settings),
  checkUpdates: () => ipcRenderer.invoke('updates-check'),
  downloadUpdate: () => ipcRenderer.invoke('updates-download'),
  installUpdate: () => ipcRenderer.invoke('updates-install'),
  showMain: () => ipcRenderer.invoke('show-main'),
  closeHud: () => ipcRenderer.invoke('close-hud'),
  toggleHud: () => ipcRenderer.invoke('toggle-hud'),
  setHudSize: (width, height) => ipcRenderer.invoke('set-hud-size', width, height),
  openInEditor: folderPath => ipcRenderer.invoke('open-in-editor', folderPath),
  openExternal: url => ipcRenderer.invoke('open-external', url)
});
