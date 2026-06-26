#!/usr/bin/env node
import { startCoordinator } from './coordinator.js';

const coordinator = await startCoordinator();

process.on('SIGINT', async () => {
  await coordinator.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await coordinator.stop();
  process.exit(0);
});
