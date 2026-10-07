// The updater is injected so the state machine can be verified without Electron,
// a network connection, or launching an installer.
function validateFeedUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw Error('Informe a pasta HTTPS das versões.');
  let url;
  try { url = new URL(value.trim()); } catch { throw Error('Endereço de atualização inválido.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw Error('Use HTTPS, sem credenciais, parâmetros ou fragmentos.');
  }
  if (/\.(exe|ya?ml|blockmap)$/i.test(url.pathname)) throw Error('Informe a pasta das versões, sem o nome do arquivo.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

function validateArtifacts(info, feedUrl) {
  const base = new URL(validateFeedUrl(feedUrl));
  const files = Array.isArray(info?.files) && info.files.length ? info.files : [{ url: info?.path }];
  if (typeof info?.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(info.version)) throw Error('Versão inválida no manifesto.');
  if (info.packages) throw Error('Atualizações por instalador web não são permitidas.');
  for (const file of files) {
    if (typeof file?.url !== 'string' || !file.url) throw Error('Manifesto sem arquivo de atualização.');
    const url = new URL(file.url, base);
    if (!isAllowedUpdateRequest(url.href, base.href) || url.search || url.hash) {
      throw Error('O manifesto aponta para um arquivo fora da fonte autorizada.');
    }
  }
  return info.version;
}

function isAllowedUpdateRequest(value, feedUrl) {
  try {
    const url = new URL(value), base = new URL(feedUrl);
    const decoded = decodeURIComponent(url.pathname);
    return url.protocol === 'https:' && url.origin === base.origin && !url.username && !url.password &&
      url.pathname.startsWith(base.pathname) && !decoded.includes('\\') && !/(?:^|\/)\.\.?\//.test(decoded);
  } catch { return false; }
}

function createUpdateController({ updater, supported, currentVersion, initial = {}, save, confirmFeed = async () => true, confirmInstall = async () => true, prepareInstall = async () => {} }) {
  let busy = false, updateInfo = null;
  let settings = { enabled: initial.enabled === true, feedUrl: '' };
  try { settings.feedUrl = initial.feedUrl ? validateFeedUrl(initial.feedUrl) : ''; } catch { settings.enabled = false; }
  settings.enabled &&= Boolean(settings.feedUrl);
  let state = { supported, ...settings, currentVersion, status: 'disabled', message: '', availableVersion: null, progress: 0, checkedAt: null };
  const snapshot = () => ({ ...state });
  const set = patch => { state = { ...state, ...patch }; return snapshot(); };
  const reset = () => set({ ...settings, status: supported && settings.enabled ? 'idle' : 'disabled', message: !supported ? 'Atualizações disponíveis apenas no aplicativo Windows instalado.' : settings.enabled ? 'Verificações automáticas ativas; baixar e instalar dependem de você.' : 'Configure uma fonte confiável e ative as verificações.', availableVersion: null, progress: 0 });
  const fail = error => set({ status: 'error', message: 'Falha na atualização: ' + String(error?.message || error).slice(0, 500) + (state.status === 'installing' ? ' Reinicie o DevSync para retomar a sincronização.' : '') });
  reset();
  if (updater) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.allowPrerelease = false;
    updater.disableWebInstaller = true;
    // Avoid logging signed URLs or provider internals to the desktop console.
    updater.logger = null;
    updater.on('error', fail);
    updater.on('download-progress', progress => set({ progress: Math.min(100, Math.max(0, Number(progress.percent) || 0)) }));
    updater.on('update-downloaded', info => {
      try { validateArtifacts(info, settings.feedUrl); set({ status: 'downloaded', progress: 100, message: 'Atualização pronta. Clique em instalar para reiniciar.' }); } catch (error) { updateInfo = null; fail(error); }
    });
  }
  return {
    state: snapshot,
    async configure(next) {
      if (busy || ['downloaded', 'installing'].includes(state.status)) throw Error('Conclua a atualização antes de alterar a fonte.');
      if (!next || typeof next.enabled !== 'boolean' || typeof next.feedUrl !== 'string') throw Error('Configuração inválida.');
      const feedUrl = next.feedUrl.trim() ? validateFeedUrl(next.feedUrl) : '';
      if (next.enabled && !feedUrl) throw Error('Informe a fonte HTTPS para ativar as verificações.');
      busy = true;
      try {
        if (feedUrl && feedUrl !== settings.feedUrl && !(await confirmFeed(feedUrl))) return snapshot();
        const updated = { enabled: next.enabled, feedUrl };
        await save(updated);
        settings = updated; updateInfo = null;
        return reset();
      } finally { busy = false; }
    },
    async check() {
      if (busy || !supported || !settings.enabled || ['downloaded', 'installing'].includes(state.status)) return snapshot();
      busy = true; updateInfo = null;
      set({ status: 'checking', message: 'Consultando novas versões...', availableVersion: null, progress: 0 });
      try {
        updater.setFeedURL({ provider: 'generic', url: settings.feedUrl, useMultipleRangeRequest: false });
        const result = await updater.checkForUpdates();
        if (!result) throw Error('A verificação não retornou informações.');
        const version = validateArtifacts(result.updateInfo, settings.feedUrl);
        set({ checkedAt: new Date().toISOString() });
        // electron-updater resolves availability after semver, staging and downgrade checks.
        if (result.isUpdateAvailable === true) {
          updateInfo = result.updateInfo;
          return set({ status: 'available', availableVersion: version, message: 'Nova versão disponível: ' + version });
        }
        return set({ status: 'current', message: 'Você está com a versão disponível para este computador.' });
      } catch (error) { return fail(error); } finally { busy = false; }
    },
    async download() {
      if (busy || !supported || !settings.enabled || state.status !== 'available' || !updateInfo) throw Error('Verifique uma nova versão antes de baixar.');
      busy = true;
      try {
        validateArtifacts(updateInfo, settings.feedUrl);
        set({ status: 'downloading', progress: 0, message: 'Baixando a atualização...' });
        await updater.downloadUpdate();
        return snapshot();
      } catch (error) { updateInfo = null; return fail(error); } finally { busy = false; }
    },
    async install() {
      if (busy || !supported || state.status !== 'downloaded' || !updateInfo) throw Error('Baixe a atualização antes de instalar.');
      busy = true;
      try {
        if (!(await confirmInstall(state.availableVersion))) return snapshot();
        set({ status: 'installing', message: 'Encerrando a sincronização e iniciando o instalador...' });
        await prepareInstall();
        updater.quitAndInstall(false, true);
        return snapshot();
      } catch (error) { return fail(error); } finally { busy = false; }
    }
  };
}

module.exports = { validateFeedUrl, validateArtifacts, isAllowedUpdateRequest, createUpdateController };
