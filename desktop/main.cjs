const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain, Notification } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { deflateSync } = require('node:zlib');
let window, tray, service, runtime, quitting = false, pollTimer;
const smoke = process.argv.includes('--smoke-test');
let bridgeReady = false;
if (smoke) {
  process.env.DEVSYNC_HOME ||= path.join(app.getPath('temp'), 'devsync-smoke-' + process.pid);
  const profile = path.join(process.env.DEVSYNC_HOME, 'electron');
  require('node:fs').mkdirSync(profile, { recursive:true });
  app.setPath('userData', profile);
}
const startupArgs = app.isPackaged ? ['--background'] : [app.getAppPath(), '--background'];
function icon() {
  const crc = bytes => { let n = -1; for (const b of bytes) { n ^= b; for (let i=0;i<8;i++) n=(n>>>1)^((n&1)?0xedb88320:0); } return (n^-1)>>>0; };
  const chunk = (kind, bytes) => { const name=Buffer.from(kind), size=Buffer.alloc(4), check=Buffer.alloc(4); size.writeUInt32BE(bytes.length);check.writeUInt32BE(crc(Buffer.concat([name,bytes])));return Buffer.concat([size,name,bytes,check]); };
  const header=Buffer.alloc(13);header.writeUInt32BE(32,0);header.writeUInt32BE(32,4);header[8]=8;header[9]=6;
  const pixels=Buffer.alloc(32*(1+32*4));
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=y*129+1+x*4;const light=(x>=8&&x<=11&&y>=7&&y<=24)||(x>=12&&x<=21&&(y<=10&&y>=7||y>=21&&y<=24))||(x>=21&&x<=24&&y>=10&&y<=21);pixels.set(light?[232,239,255,255]:[34,56,92,255],i)}
  return nativeImage.createFromBuffer(Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
function trusted(event) { return window && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame && new URL(event.senderFrame.url).origin === `http://127.0.0.1:${runtime.port}`; }
async function show() { if (window) { window.show(); window.focus(); return; }
  window = new BrowserWindow({ show: !smoke, width: 1120, height: 820, minWidth: 720, title: 'DevSync', icon: icon(), webPreferences: { preload: path.join(__dirname,'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== `http://127.0.0.1:${runtime.port}`) event.preventDefault(); });
  window.on('close', event => { if (!quitting) { event.preventDefault(); window.hide(); } });
  window.on('closed', () => { window = null; });
  await window.loadURL(`http://127.0.0.1:${runtime.port}/#${runtime.token}`);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => show());
  app.on('window-all-closed', () => {});
  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('com.devsync.desktop');
    const { read } = await import(pathToFileURL(path.join(__dirname,'../src/store.js')).href);
    try {
      try {
        const existing = await read('runtime.json');
        const response = await fetch(`http://127.0.0.1:${existing.port}/api/status`, { headers:{authorization:`Bearer ${existing.token}`}, signal:AbortSignal.timeout(2000) });
        if (response.ok) runtime = existing;
      } catch {}
      if (!runtime) {
        const { daemon } = await import(pathToFileURL(path.join(__dirname,'../src/daemon.js')).href);
        service = await daemon(); runtime = service;
      }
      ipcMain.handle('choose-folder', async event => { if (!trusted(event)) throw Error('Origem inválida.');const result=await dialog.showOpenDialog(window,{properties:['openDirectory']});return result.canceled?null:result.filePaths[0]; });
      ipcMain.handle('startup-get', event => { if(!trusted(event))throw Error('Origem inválida.');bridgeReady=true;return app.getLoginItemSettings({path:process.execPath,args:startupArgs}).openAtLogin; });
      ipcMain.handle('startup-set', (event, enabled) => { if(!trusted(event)||typeof enabled!=='boolean')throw Error('Pedido inválido.');app.setLoginItemSettings({openAtLogin:enabled,path:process.execPath,args:startupArgs});return app.getLoginItemSettings({path:process.execPath,args:startupArgs}).openAtLogin; });
      tray = new Tray(icon());tray.setToolTip('DevSync — sincronização de projetos');
      tray.setContextMenu(Menu.buildFromTemplate([{label:'Abrir DevSync',click:show},{label:'Sair',click:()=>app.quit()}]));tray.on('double-click',show);
      const last = new Map(); let checking=false;
      pollTimer=setInterval(async()=>{if(checking)return;checking=true;try{const r=await fetch(`http://127.0.0.1:${runtime.port}/api/status`,{headers:{authorization:`Bearer ${runtime.token}`},signal:AbortSignal.timeout(5000)});if(!r.ok)return;const {projects}=await r.json();for(const p of projects){const previous=last.get(p.id);last.set(p.id,p.state);if(previous&&previous!==p.state&&['error','dirty','diverged','synced'].includes(p.state)&&Notification.isSupported())new Notification({title:'DevSync: '+p.name,body:p.state==='synced'?'Projeto sincronizado.':'O projeto precisa de atenção. Abra o DevSync para ver os detalhes.'}).show()}}catch{}finally{checking=false}},10000);
      if (!process.argv.includes('--background')) await show();
      if (smoke) setTimeout(() => { console.log(JSON.stringify({ desktopSmoke: bridgeReady ? 'passed' : 'failed', tray: !tray.isDestroyed(), ownedService: Boolean(service) })); if(!bridgeReady)process.exitCode=1;app.quit(); }, 2000);
    } catch (error) { dialog.showErrorBox('Não foi possível iniciar o DevSync',error.message);app.quit(); }
  });
  app.on('before-quit', event => { if (quitting) return;event.preventDefault();quitting=true;clearInterval(pollTimer);Promise.resolve(service?.stop()).finally(()=>{tray?.destroy();app.quit()}); });
}
