#!/usr/bin/env node
/**
 * Firebase connectivity test — writes a test command and checks desktop can respond.
 * Run while desktop coordinator is running.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load .env
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const { initFirebase, writeResponse } = await import('../orchestra/desktop/firebase-client.ts');
const { generateId, commandDocPath, responseDocPath } = await import('../orchestra/shared/firebase-paths.ts');

const db = initFirebase();
const commandId = generateId('test_cmd');
const sessionId = generateId('test_session');

const command = {
  id: commandId,
  type: 'activate',
  sessionId,
  userId: 'firebase_test',
  payload: { targetDesktopId: 'any' },
  createdAt: Date.now(),
  status: 'pending',
};

console.log('Writing test command:', commandId);
await db.doc(commandDocPath(commandId)).set(command);

console.log('Waiting for desktop response (30s)...');
const deadline = Date.now() + 30000;

while (Date.now() < deadline) {
  const snap = await db.doc(responseDocPath(commandId)).get();
  if (snap.exists && snap.data()?.message) {
    console.log('\nSUCCESS — Desktop responded:');
    console.log(snap.data().message);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 2000));
}

console.error('\nTIMEOUT — Desktop coordinator may not be running.');
console.error('Start it with: npm run orchestra:start');
process.exit(1);
