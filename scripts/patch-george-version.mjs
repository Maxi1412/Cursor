#!/usr/bin/env node
/**
 * Patches George Android version to match george-orchestra.config.json (2.19.0).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const config = JSON.parse(readFileSync(join(ROOT, 'george-orchestra.config.json'), 'utf8'));
const georgeRoot = process.argv[2] || config.georgeProjectPath;

const { version, versionCode, name } = config.app;
const buildGradle = join(georgeRoot, 'android', 'app', 'build.gradle');
const buildGradleKts = join(georgeRoot, 'android', 'app', 'build.gradle.kts');
const appJson = join(georgeRoot, 'app.json');
const packageJson = join(georgeRoot, 'package.json');

let patched = 0;

function patchGradle(path) {
  if (!existsSync(path)) return;
  let content = readFileSync(path, 'utf8');
  const orig = content;

  content = content.replace(/versionName\s+["'][^"']*["']/g, `versionName "${version}"`);
  content = content.replace(/versionCode\s+\d+/g, `versionCode ${versionCode}`);

  if (content !== orig) {
    writeFileSync(path, content);
    console.log(`Patched: ${path} → versionName ${version}, versionCode ${versionCode}`);
    patched++;
  }
}

patchGradle(buildGradle);
patchGradle(buildGradleKts);

if (existsSync(appJson)) {
  const app = JSON.parse(readFileSync(appJson, 'utf8'));
  if (app.expo?.version) app.expo.version = version;
  if (app.version) app.version = version;
  writeFileSync(appJson, JSON.stringify(app, null, 2) + '\n');
  console.log(`Patched: app.json → ${version}`);
  patched++;
}

if (existsSync(packageJson)) {
  const pkg = JSON.parse(readFileSync(packageJson, 'utf8'));
  pkg.version = version;
  writeFileSync(packageJson, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Patched: package.json → ${version}`);
  patched++;
}

// Write version manifest for deploy confirmation
const manifestPath = join(georgeRoot, 'builds', 'version-manifest.json');
const manifest = {
  appName: name,
  version,
  versionCode,
  previousVersion: config.app.previousVersion,
  builtAt: new Date().toISOString(),
  apkFileName: config.deploy.apkFileName,
};
try {
  const { mkdirSync } = await import('node:fs');
  mkdirSync(join(georgeRoot, 'builds'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote: ${manifestPath}`);
} catch {
  // George path may not exist in CI
}

if (patched === 0 && !existsSync(buildGradle) && !existsSync(buildGradleKts)) {
  console.warn(`WARN: No George android build files found at ${georgeRoot}`);
} else {
  console.log(`Version patch complete: ${config.app.previousVersion} → ${version}`);
}
