import dgram from 'node:dgram';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import os from 'node:os';
import { rm, writeFile } from 'node:fs/promises';
import { git, gitRaw } from './git.js';

const P2P_PORT = 48123;
const BEACON_INTERVAL_MS = 5000;
const PEER_EXPIRY_MS = 15000;

export function getLocalIpAddresses() {
  const addresses = [];
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

export async function createBundle(repoPath, bundleFile, branch = 'HEAD') {
  await git(repoPath, 'bundle', 'create', bundleFile, branch);
  return bundleFile;
}

export async function verifyAndFetchBundle(repoPath, bundleFile, branch = 'main') {
  await git(repoPath, 'bundle', 'verify', bundleFile);
  await git(repoPath, 'fetch', bundleFile, `${branch}:refs/remotes/p2p/${branch}`);
  return true;
}

export async function syncFromPeerBundle(repo, peer, { branch = repo.branch } = {}) {
  const targetBranch = branch || repo.branch || 'main';
  const url = `http://${peer.ip}:${peer.httpPort}/api/p2p/bundle?project=${encodeURIComponent(repo.name || repo.id)}&branch=${encodeURIComponent(targetBranch)}`;
  const headers = peer.token ? { Authorization: `Bearer ${peer.token}` } : {};

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    let err = 'Falha ao solicitar bundle do peer';
    try {
      const j = await response.json();
      err = j.error || err;
    } catch {}
    throw new Error(`Erro P2P (${peer.name || peer.ip}): ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const tempBundlePath = path.join(os.tmpdir(), `devsync-p2p-${repo.id || 'repo'}-${Date.now()}.bundle`);
  try {
    await writeFile(tempBundlePath, Buffer.from(arrayBuffer));
    await verifyAndFetchBundle(repo.path, tempBundlePath, targetBranch);
    
    // Fast-forward local branch if clean
    let currentBranch = '';
    try {
      currentBranch = await git(repo.path, 'symbolic-ref', '--short', 'HEAD');
    } catch {
      try {
        currentBranch = await git(repo.path, 'rev-parse', '--abbrev-ref', 'HEAD');
      } catch {}
    }
    
    // Check if repo has HEAD commit yet
    let hasHead = false;
    try {
      await git(repo.path, 'rev-parse', '--verify', 'HEAD');
      hasHead = true;
    } catch {}

    if (!hasHead) {
      // Empty repo receiving initial branch
      try {
        await git(repo.path, 'reset', '--hard', `refs/remotes/p2p/${targetBranch}`);
      } catch {}
    } else if (currentBranch === targetBranch) {
      const isDirty = Boolean(await git(repo.path, 'status', '--porcelain'));
      if (!isDirty) {
        try {
          await git(repo.path, 'merge', '--ff-only', `refs/remotes/p2p/${targetBranch}`);
        } catch {
          // Divergence: fetched into refs/remotes/p2p/branch safely
        }
      }
    }
    return { ok: true, peer: peer.name || peer.ip, branch: targetBranch };
  } finally {
    await rm(tempBundlePath, { force: true }).catch(() => {});
  }
}

export class P2PManager {
  constructor({ deviceId, name, httpPort, token }) {
    this.deviceId = deviceId;
    this.name = name;
    this.httpPort = httpPort;
    this.token = token;
    this.peers = new Map();
    this.socket = null;
    this.timer = null;
  }

  start() {
    if (this.socket) return;
    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', () => {
        // Safe degrade if port is occupied
      });

      this.socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString('utf8'));
          if (data.type === 'devsync-p2p' && data.deviceId && data.deviceId !== this.deviceId) {
            this.peers.set(data.deviceId, {
              deviceId: data.deviceId,
              name: data.name,
              httpPort: data.httpPort,
              token: data.token || '',
              ip: rinfo.address,
              lastSeen: Date.now()
            });
          }
        } catch {}
      });

      this.socket.bind(P2P_PORT, () => {
        try {
          this.socket.setBroadcast(true);
        } catch {}
      });

      this.timer = setInterval(() => this.broadcastBeacon(), BEACON_INTERVAL_MS);
      this.broadcastBeacon();
    } catch {}
  }

  broadcastBeacon() {
    if (!this.socket) return;
    const now = Date.now();
    for (const [id, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > PEER_EXPIRY_MS) {
        this.peers.delete(id);
      }
    }

    const payload = Buffer.from(JSON.stringify({
      type: 'devsync-p2p',
      deviceId: this.deviceId,
      name: this.name,
      httpPort: this.httpPort,
      token: this.token,
      timestamp: now
    }));

    try {
      this.socket.send(payload, 0, payload.length, P2P_PORT, '255.255.255.255');
    } catch {}
  }

  getPeers() {
    const now = Date.now();
    const result = [];
    for (const [id, p] of this.peers.entries()) {
      if (now - p.lastSeen <= PEER_EXPIRY_MS) {
        result.push({
          deviceId: p.deviceId,
          name: p.name,
          httpPort: p.httpPort,
          token: p.token,
          ip: p.ip,
          latency: now - p.lastSeen
        });
      }
    }
    return result;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
  }
}
