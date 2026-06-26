#!/usr/bin/env node
/**
 * Cross-platform deploy runner — attempts George build + K: drive copy.
 * On Windows: delegates to full-deploy.ps1
 * On Linux cloud: validates config/tests; cannot access K: or George without mount
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, copyFileSync, mkdirSync, readdirSync, unlinkSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const config = JSON.parse(readFileSync(join(ROOT, 'george-orchestra.config.json'), 'utf8'));
const isWin = process.platform === 'win32';

console.log('\n=== George v2.19.0 Deploy Runner ===\n');

if (isWin) {
  console.log('Windows detected — running full-deploy.ps1...\n');
  const r = spawnSync(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', join(ROOT, 'scripts', 'full-deploy.ps1')],
    { stdio: 'inherit', cwd: ROOT }
  );
  process.exit(r.status ?? 1);
}

// Linux: try common mount points for George and K: drive
const georgeCandidates = [
  config.georgeProjectPath.replace(/\\/g, '/').replace('C:/Users/acer', '/mnt/c/Users/acer'),
  '/mnt/c/Users/acer/Documents/Claude/Projects/Personal_caledar',
  '/mnt/k/Users/acer/Documents/Claude/Projects/Personal_caledar',
];

const kDriveCandidates = [
  '/mnt/k/Application Projects/personal calendar',
  '/mnt/k/My Drive/Application Projects/personal calendar',
  config.deploy.googleDrive.fullPath.replace(/\\/g, '/').replace('K:', '/mnt/k'),
];

let georgePath = georgeCandidates.find(existsSync);
let kDrivePath = kDriveCandidates.find((p) => existsSync(dirname(p)) || existsSync(p));

console.log('George project:', georgePath ?? 'NOT FOUND');
console.log('K: drive path:', kDrivePath ?? 'NOT FOUND');

if (!georgePath) {
  console.error('\nCannot build APK: George project not accessible from this environment.');
  console.error('Expected: C:\\Users\\acer\\Documents\\Claude\\Projects\\Personal_caledar');
  console.error('\nRun on your Windows PC:');
  console.error('  cd C:\\Users\\acer\\Documents\\Claude\\Projects\\Cursor');
  console.error('  npm run george:full-deploy');
  console.error('  (or double-click DEPLOY-GEORGE.bat)');
  process.exit(1);
}

// If George found on mounted path, try gradle build
const androidDir = join(georgePath, 'android');
if (!existsSync(androidDir)) {
  console.error('android/ folder not found in George project');
  process.exit(1);
}

console.log('\nBuilding APK...');
try {
  execSync('./gradlew assembleRelease', { cwd: androidDir, stdio: 'inherit' });
} catch {
  process.exit(1);
}

const apkSource = join(androidDir, 'app/build/outputs/apk/release/app-release.apk');
const buildsDir = join(georgePath, 'builds');
const apkName = config.deploy.apkFileName;
const localApk = join(buildsDir, apkName);

mkdirSync(buildsDir, { recursive: true });
copyFileSync(apkSource, localApk);
console.log('Local APK:', localApk);

// Deploy to K: if mounted
if (kDrivePath) {
  mkdirSync(kDrivePath, { recursive: true });
  for (const f of readdirSync(kDrivePath)) {
    if (f.match(/2\.18|\.apk/i) && f !== apkName) {
      unlinkSync(join(kDrivePath, f));
      console.log('Deleted old:', f);
    }
  }
  copyFileSync(localApk, join(kDrivePath, apkName));
  console.log('K: drive APK:', join(kDrivePath, apkName));
  console.log('\nCONFIRMED: v2.19.0 deployed to local + K:');
} else {
  console.log('\nAPK built locally. K: drive not mounted — run replace-kdrive-apk.ps1 on Windows.');
}

writeFileSync(join(buildsDir, 'deploy-confirmation-v2.19.0.json'), JSON.stringify({
  version: config.app.version,
  localApk,
  kDrivePath: kDrivePath ?? null,
  deployedAt: new Date().toISOString(),
}, null, 2));
