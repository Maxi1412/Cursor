import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cron from 'node-cron';
import { loadConfig } from '@mediadeck/config';
import { COLLECTIONS, DOC_IDS } from '@mediadeck/types';
import { createStorage, seedFixtures } from '@mediadeck/storage';
import { createAdapters } from './adapters/index.js';
import type { AppContext } from './context.js';
import { registerRoutes } from './routes.js';
import { runEnabledCapabilities } from './capabilities/index.js';

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: { level: config.isProd ? 'info' : 'debug' } });

  const storage = await createStorage({
    backend: config.storage.backend,
    sqlitePath: config.storage.sqlitePath,
    firebaseProjectId: config.storage.firebaseProjectId,
    firebaseServiceAccountPath: config.storage.firebaseServiceAccountPath,
  });

  // Seed demo data on first boot (idempotent; only when the library is empty).
  const seeded = await storage.getDoc(COLLECTIONS.features, DOC_IDS.featureState);
  if (!seeded) {
    await seedFixtures(storage);
    app.log.info('Seeded demo fixtures (first boot).');
  }

  const ctx: AppContext = {
    config,
    storage,
    adapters: createAdapters(config),
    log: (msg, extra) => app.log.info(extra ?? {}, msg),
  };

  for (const w of config.warnings) app.log.warn(w);

  await app.register(cors, { origin: true });
  await registerRoutes(app, ctx);

  // Scheduled capability runs (each internally gated; masters-off are skipped).
  if (config.scheduling.enabled && cron.validate(config.scheduling.capabilityCron)) {
    cron.schedule(config.scheduling.capabilityCron, () => {
      runEnabledCapabilities(ctx)
        .then((r) => r.length && app.log.info({ results: r }, 'capability run'))
        .catch((e) => app.log.error(e));
    });
  }

  return { app, ctx };
}

// Entrypoint — start listening when run directly (node dist/server.js / tsx src/server.ts).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain || process.env.ORCH_START === '1') {
  const { app, ctx } = await buildServer();
  app
    .listen({ host: ctx.config.server.host, port: ctx.config.server.port })
    .then((addr) => app.log.info(`MediaDeck orchestrator listening on ${addr}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
