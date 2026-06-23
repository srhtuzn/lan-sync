import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import type { ScanResult, DeviceStatus } from '@lan-sync/shared';

function getSubnet(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        const parts = net.address.split('.');
        return parts.slice(0, 3).join('.');
      }
    }
  }
  return '192.168.1';
}

function getOwnIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

export const scanRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { subnet?: string } }>('/api/scan', async (request): Promise<ScanResult> => {
    const subnet = request.body?.subnet ?? getSubnet();
    const PORT = 37821;
    const ownIp = getOwnIp();

    const checks = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`).map(async (ip) => {
      if (ip === ownIp) return null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 300);
        const res = await fetch(`http://${ip}:${PORT}/api/status`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const status = await res.json() as DeviceStatus;
        return { ip, port: PORT, status };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(checks);
    return { peers: results.filter(Boolean) as ScanResult['peers'] };
  });
};
