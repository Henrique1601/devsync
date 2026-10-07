import { mkdir, readFile, writeFile, stat, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

function isDead(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; }
  catch (error) { return error.code === 'ESRCH'; }
}

export async function acquireServiceLock(home) {
  const lock = path.join(home, 'daemon.lock');
  async function create() {
    await mkdir(lock);
    try { await writeFile(path.join(lock,'owner.json'), JSON.stringify({pid:process.pid}), {flag:'wx',mode:0o600}); }
    catch (error) { await rm(lock,{recursive:true,force:true});throw error; }
  }
  try { await create(); return lock; }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const blocked = () => new Error('Há um serviço ativo ou um bloqueio cuja origem não pôde ser confirmada. Encerre o serviço pelo terminal ou pela bandeja antes de abrir outra instância.');
  // A freshly created directory may belong to another instance still starting.
  if (Date.now() - (await stat(lock)).mtimeMs < 5000) throw blocked();
  let owner;
  try { owner = JSON.parse(await readFile(path.join(lock,'owner.json'),'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw blocked();
    try { owner = JSON.parse(await readFile(path.join(home,'runtime.json'),'utf8')); }
    catch { throw blocked(); }
  }
  if (!isDead(owner.pid)) throw blocked();
  // Only one recovering instance can claim the stale directory.
  const claim = path.join(lock,'recovery');
  try { await mkdir(claim); } catch { throw blocked(); }
  const stale = path.join(home, `daemon-stale-${randomUUID()}`);
  try {
    await rename(lock,stale);
    await create();
  } finally {
    await rm(stale,{recursive:true,force:true});
  }
  return lock;
}
