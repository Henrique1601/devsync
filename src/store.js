import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export const home = path.resolve(process.env.DEVSYNC_HOME || path.join(os.homedir(), '.devsync'));
export async function read(name, fallback) {
  try { return JSON.parse(await readFile(path.join(home, name), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}
export async function write(name, value) {
  await mkdir(home, { recursive: true, mode: 0o700 });
  const destination = path.join(home, name);
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, destination);
}
