import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import updates from '../desktop/updates.cjs';
const { validateFeedUrl, validateArtifacts, isAllowedUpdateRequest, createUpdateController } = updates;
const feedUrl = 'https://updates.example.com/windows/';
const info = { version: '0.4.0', files: [{ url: 'DevSync Setup 0.4.0.exe', sha512: 'checksum' }] };
function fixture(options = {}) {
  const updater = new EventEmitter();
  const calls = [], saved = [];
  updater.setFeedURL = value => calls.push(['feed', value]);
  updater.checkForUpdates = async () => { calls.push(['check']); return { isUpdateAvailable: true, updateInfo: info }; };
  updater.downloadUpdate = async () => { calls.push(['download']); updater.emit('download-progress', { percent: 42 }); updater.emit('update-downloaded', info); };
  updater.quitAndInstall = (...args) => calls.push(['install', ...args]);
  const controller = createUpdateController({ updater, supported: true, currentVersion: '0.3.0', initial: { enabled: true, feedUrl }, save: async value => saved.push(value), prepareInstall: async () => calls.push(['stop']), ...options });
  return { controller, updater, calls, saved };
}

test('updates accept only HTTPS directories without embedded credentials or query strings', () => {
  assert.equal(validateFeedUrl(' https://updates.example.com/windows '), feedUrl);
  for (const url of ['http://localhost/releases/', 'file:///C:/updates', 'https://user:secret@example.com/', 'https://example.com/?token=secret', 'https://example.com/#feed', 'https://example.com/latest.yml', 'https://example.com/setup.exe', 'not-a-url']) assert.throws(() => validateFeedUrl(url));
});
test('update artifacts and redirected requests stay inside the explicitly trusted HTTPS feed', () => {
  assert.equal(validateArtifacts(info, feedUrl), '0.4.0');
  for (const url of ['http://updates.example.com/windows/app.exe', '//evil.example/app.exe', '../other/app.exe', 'https://updates.example.com/windows/%2e%2e%2fapp.exe', 'https://u:p@updates.example.com/windows/app.exe']) {
    assert.throws(() => validateArtifacts({ ...info, files: [{ url }] }, feedUrl));
    assert.equal(isAllowedUpdateRequest(new URL(url, feedUrl).href, feedUrl), false);
  }
  assert.equal(isAllowedUpdateRequest(feedUrl + 'latest.yml?noCache=123', feedUrl), true);
  assert.throws(() => validateArtifacts({ ...info, packages: {} }, feedUrl));
});
test('checking never downloads; download never installs; install stops the service before installer launch', async () => {
  const { controller, updater, calls } = fixture();
  assert.equal(updater.autoDownload, false); assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowDowngrade, false); assert.equal(updater.disableWebInstaller, true);
  await assert.rejects(controller.install(), /Baixe/);
  assert.equal((await controller.check()).status, 'available');
  assert.equal(calls.some(c => c[0] === 'download'), false);
  assert.equal((await controller.download()).status, 'downloaded');
  assert.equal(calls.some(c => c[0] === 'install'), false);
  await controller.install();
  assert.deepEqual(calls.slice(-2), [['stop'], ['install', false, true]]);
});
test('opt-in, cancellation, developer mode and invalid metadata cannot launch downloads or installers', async () => {
  const { controller, calls, saved } = fixture({ initial: {}, confirmFeed: async () => false });
  await controller.check(); assert.equal(calls.length, 0);
  await controller.configure({ enabled: true, feedUrl }); assert.equal(saved.length, 0);
  const dev = fixture({ supported: false }); await dev.controller.check();
  assert.equal(dev.controller.state().status, 'disabled'); assert.equal(dev.calls.length, 0);
  const cancelled = fixture({ confirmInstall: async () => false });
  await cancelled.controller.check(); await cancelled.controller.download(); await cancelled.controller.install();
  assert.equal(cancelled.controller.state().status, 'downloaded'); assert.equal(cancelled.calls.some(c => c[0] === 'stop'), false);
  const malicious = fixture(); malicious.updater.checkForUpdates = async () => ({ isUpdateAvailable: true, updateInfo: { ...info, files: [{ url: 'https://evil.example/setup.exe' }] } });
  assert.equal((await malicious.controller.check()).status, 'error'); await assert.rejects(malicious.controller.download());
});
test('configuration and downloads are serialized, failures allow an explicit retry', async () => {
  const { controller, updater } = fixture();
  let release;
  updater.checkForUpdates = () => new Promise(resolve => { release = resolve; });
  const pending = controller.check();
  await assert.rejects(controller.configure({ enabled: false, feedUrl }), /Conclua/);
  release({ isUpdateAvailable: false, updateInfo: { ...info, version: '0.3.0' } });
  assert.equal((await pending).status, 'current');
  updater.checkForUpdates = async () => { throw Error('Rede indisponível'); };
  assert.equal((await controller.check()).status, 'error');
  updater.checkForUpdates = async () => ({ isUpdateAvailable: true, updateInfo: info });
  assert.equal((await controller.check()).status, 'available');
  updater.downloadUpdate = async () => { throw Error('Checksum inválido'); };
  assert.equal((await controller.download()).status, 'error');
  await assert.rejects(controller.install());
});
test('installer launch failures remain visible and explain how to resume the stopped service', async () => {
  const { controller, updater, calls } = fixture();
  await controller.check(); await controller.download();
  updater.quitAndInstall = () => updater.emit('error', Error('Instalador indisponível'));
  const result = await controller.install();
  assert.equal(result.status, 'error');
  assert.match(result.message, /Reinicie o DevSync/);
  assert.equal(calls.filter(c => c[0] === 'stop').length, 1);
});
