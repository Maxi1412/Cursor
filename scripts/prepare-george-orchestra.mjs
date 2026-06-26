#!/usr/bin/env node
/**
 * Prepares orchestra module for React Native (Metro bundler).
 * Strips Node ESM .js extensions and import attributes.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = process.argv[2] || join(ROOT, '.george-orchestra-staging');

const SOURCE_DIRS = [
  { from: join(ROOT, 'orchestra/shared'), to: join(OUT, 'shared') },
  { from: join(ROOT, 'orchestra/mobile'), to: join(OUT, 'mobile') },
];

function transformTs(content) {
  return content
    .replace(/from ['"](\.[^'"]+)\.js['"]/g, "from '$1'")
    .replace(/import (\w+) from ['"]([^'"]+\.json)['"] with \{ type: 'json' \}/g, "import $1 from '$2'")
    .replace(/export \{ orchestraConfig \} from ['"]\.\/routing\.js['"]/g, "export { orchestraConfig } from './routing'");
}

function copyAndTransform(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyAndTransform(srcPath, destPath);
    } else if (entry.endsWith('.ts')) {
      const content = readFileSync(srcPath, 'utf8');
      writeFileSync(destPath, transformTs(content));
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

mkdirSync(OUT, { recursive: true });

for (const { from, to } of SOURCE_DIRS) {
  copyAndTransform(from, to);
}

// Copy george-bridge template
const bridgeSrc = join(ROOT, 'george-integration/george-bridge.ts');
const bridgeDest = join(OUT, 'george-bridge.ts');
writeFileSync(bridgeDest, readFileSync(bridgeSrc, 'utf8'));

// Copy config
cpSync(join(ROOT, 'orchestra/shared/orchestra-config.json'), join(OUT, 'shared/orchestra-config.json'));

console.log(`Prepared RN orchestra module at: ${OUT}`);
console.log(`Files: ${relative(ROOT, OUT)}`);
