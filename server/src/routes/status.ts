import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import { rootDir, syncState } from '../state.js';
import type { DeviceStatus } from '@lan-sync/shared';

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

export const statusRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/status', async (): Promise<DeviceStatus> => ({
    deviceName: os.hostname(),
    ip: getLocalIp(),
    port: 37821,
    rootPath: rootDir,
    syncState,
    version: '1.0.0',
  }));
};
