#!/usr/bin/env node
/**
 * Queue full_deploy command to Firebase — desktop coordinator on Windows will execute it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const { initFirebase } = await import('../orchestra/desktop/firebase-client.ts');
const { generateId, commandDocPath } = await import('../orchestra/shared/firebase-paths.ts');

const commandId = generateId('deploy_cmd');
const sessionId = generateId('deploy_session');

const command = {
  id: commandId,
  type: 'full_deploy',
  sessionId,
  userId: 'cursor_cloud_agent',
  payload: {
    targetDesktopId: 'any',
    version: '2.19.0',
    apkFileName: 'Personal_Calendar_v2.19.0.apk',
    kDrivePath: 'K:\\Application Projects\\personal calendar',
    requestedAt: new Date().toISOString(),
  },
  createdAt: Date.now(),
  status: 'pending',
};

try {
  const db = initFirebase();
  await db.doc(commandDocPath(commandId)).set(command);
  console.log('Deploy command queued in Firebase.');
  console.log('Command ID:', commandId);
  console.log('');
  console.log('Your Windows desktop coordinator must be running:');
  console.log('  npm run orchestra:start');
  console.log('');
  console.log('It will pick up this command and run full deploy automatically.');
} catch (err) {
  console.error('Could not queue Firebase command:', err instanceof Error ? err.message : err);
  console.error('');
  console.error('On your Windows PC, run directly:');
  console.error('  cd C:\\Users\\acer\\Documents\\Claude\\Projects\\Cursor');
  console.error('  npm run george:full-deploy');
  process.exit(1);
}
