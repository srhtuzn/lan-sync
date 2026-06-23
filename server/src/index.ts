import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getSetting } from './db.js';
import { setRootDir } from './state.js';
import { scanDirectory } from './fileIndexer.js';
import { startWatcher } from './watcher.js';

import { statusRoute } from './routes/status.js';
import { indexRoute } from './routes/index.js';
import { filesRoute } from './routes/files.js';
import { configRoute } from './routes/config.js';
import { eventsRoute } from './routes/events.js';
import { scanRoute } from './routes/scan.js';
import { syncRoute } from './routes/sync.js';
import { peersRoute } from './routes/peers.js';

const PORT = 37821;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect if running from compiled dist or via tsx
const publicDir = path.resolve(__dirname, '..', 'public');

const fastify = Fastify({ logger: true });

await fastify.register(fastifyWebsocket);
await fastify.register(fastifyMultipart);

// Serve built client static files if directory exists
if (fs.existsSync(publicDir)) {
  await fastify.register(fastifyStatic, { root: publicDir, prefix: '/' });
}

await fastify.register(statusRoute);
await fastify.register(indexRoute);
await fastify.register(filesRoute);
await fastify.register(configRoute);
await fastify.register(eventsRoute);
await fastify.register(scanRoute);
await fastify.register(syncRoute);
await fastify.register(peersRoute);

const savedRootDir = getSetting('rootDir');
if (savedRootDir && fs.existsSync(savedRootDir) && fs.statSync(savedRootDir).isDirectory()) {
  setRootDir(savedRootDir);
  await scanDirectory(savedRootDir);
  startWatcher(savedRootDir);
}

// Catch-all for SPA routing (serve index.html for non-API routes)
fastify.setNotFoundHandler((request, reply) => {
  if (!request.url.startsWith('/api') && fs.existsSync(path.join(publicDir, 'index.html'))) {
    return reply.sendFile('index.html');
  }
  reply.code(404).send({ error: 'Not found' });
});

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  const { getLocalIp } = await import('./state.js');
  console.log(`\n===================================================`);
  console.log(`LAN Sync yerel ağda başarıyla başlatıldı!`);
  console.log(`- Bu bilgisayardan erişim: http://localhost:${PORT}`);
  console.log(`- Diğer bilgisayarlardan erişim: http://${getLocalIp()}:${PORT}`);
  console.log(`===================================================\n`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
