#!/usr/bin/env node
import os from 'node:os';
import { runHealthCheck, formatHealthSummary } from './health-check.js';

const desktopId = process.env.ORCHESTRA_DESKTOP_ID ?? `desktop_${os.hostname()}`;

const status = await runHealthCheck(desktopId);
console.log('\n=== George Orchestra — Desktop Health Check ===\n');
console.log(formatHealthSummary(status));
console.log('\nTool details:');
for (const [id, tool] of Object.entries(status.tools)) {
  const icon = tool.available ? '✓' : '✗';
  console.log(`  ${icon} ${tool.name} (${id})${tool.blockReason ? ` — ${tool.blockReason}` : ''}`);
}
console.log(`\nLimited mode: ${status.limitedMode ? 'YES' : 'NO'}`);
console.log(`Desktop ID: ${desktopId}\n`);
