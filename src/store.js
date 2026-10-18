import { readFile, mkdir, rename, open } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export const home = path.resolve(process.env.DEVSYNC_HOME || path.join(os.homedir(), '.devsync'));
export async function read(name, fallback) {
  const filePath = path.join(home, name);
  try {
    const raw = await readFile(filePath, 'utf8');
    if (!raw.trim() || raw.includes('\0')) throw new SyntaxError('Arquivo JSON vazio ou corrompido.');
    return JSON.parse(raw);
  }
  catch (e) {
    if (fallback !== undefined) {
      if (e.code !== 'ENOENT') {
        try {
          const backup = `${filePath}.corrupt-${Date.now()}.bak`;
          await rename(filePath, backup);
        } catch {}
      }
      return fallback;
    }
    throw e;
  }
}
export async function write(name, value) {
  await mkdir(home, { recursive: true, mode: 0o700 });
  const destination = path.join(home, name);
  const temporary = `${destination}.${process.pid}.tmp`;
  const handle = await open(temporary, 'w', 0o600);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, destination);
}
