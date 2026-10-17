import dgram from 'node:dgram';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { rm } from 'node:fs/promises';
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
