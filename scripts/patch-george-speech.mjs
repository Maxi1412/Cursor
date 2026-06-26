#!/usr/bin/env node
/**
 * Auto-patches George speech handler and App bootstrap.
 * Idempotent — skips if @george-orchestra markers already present.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const GEORGE_ROOT = process.argv[2];
const configPath = process.argv[3];

if (!GEORGE_ROOT) {
  console.error('Usage: node patch-george-speech.mjs <george-project-path> [config.json]');
  process.exit(1);
}

const config = existsSync(configPath || '')
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : { speechHandlerPatterns: [], speechHandlerFiles: [] };

const MARKER_START = '// @george-orchestra-hook';
const MARKER_END = '// @george-orchestra-hook-end';

const HOOK_BLOCK = `
  ${MARKER_START}
  const __orchestraResult = await handleOrchestraInput(text);
  if (__orchestraResult.handled) return;
  ${MARKER_END}`;

const PROMPT_HOOK = `
  ${MARKER_START}-prompt
  return getOrchestraPromptAddition(basePrompt);
  ${MARKER_END}-prompt`;

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (entry === 'node_modules' || entry === 'orchestra' || entry === '.git') continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (['.ts', '.tsx'].includes(extname(p))) files.push(p);
  }
  return files;
}

function findSpeechFiles() {
  const candidates = new Set();

  for (const rel of config.speechHandlerFiles || []) {
    const p = join(GEORGE_ROOT, rel);
    if (existsSync(p)) candidates.add(p);
  }

  const patterns = config.speechHandlerPatterns || [
    'handleVoiceCommand', 'onSpeechResult', 'processVoiceInput', 'onTranscript',
  ];

  for (const file of walk(join(GEORGE_ROOT, 'src'))) {
    const content = readFileSync(file, 'utf8');
    if (patterns.some((pat) => content.includes(pat))) {
      candidates.add(file);
    }
  }

  const appTsx = join(GEORGE_ROOT, 'App.tsx');
  if (existsSync(appTsx)) candidates.add(appTsx);

  return [...candidates];
}

function relativeImport(fromFile, georgeRoot) {
  const orchestraBridge = join(georgeRoot, 'orchestra', 'george-bridge');
  const fromDir = dirname(fromFile);
  let rel = orchestraBridge.replace(georgeRoot, '').replace(/\\/g, '/');
  if (!rel.startsWith('/')) rel = '/' + rel;
  const depth = fromDir.replace(georgeRoot, '').split(/[/\\]/).filter(Boolean).length;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  return `from '${prefix}orchestra/george-bridge'`;
}

function addImport(content, fromFile, georgeRoot) {
  if (content.includes('george-bridge')) return content;
  const importPath = relativeImport(fromFile, georgeRoot);
  const importLine = `import { initGeorgeOrchestra, handleOrchestraInput, getOrchestraPromptAddition } ${importPath};`;
  const lines = content.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, importLine);
  else lines.unshift(importLine);
  return lines.join('\n');
}

function injectSpeechHook(content) {
  if (content.includes(MARKER_START)) return content;

  const patterns = [
    /async\s+function\s+(\w+)\s*\([^)]*text[^)]*\)\s*\{/,
    /async\s+(\w+)\s*=\s*async\s*\([^)]*text[^)]*\)\s*=>\s*\{/,
    /(\w+)\s*=\s*async\s*\([^)]*text[^)]*\)\s*=>\s*\{/,
    /async\s+function\s+(handleVoice\w*|processVoice\w*|onSpeech\w*)\s*\(/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const idx = content.indexOf(match[0]);
      const braceIdx = content.indexOf('{', idx);
      if (braceIdx > 0) {
        return content.slice(0, braceIdx + 1) + HOOK_BLOCK + content.slice(braceIdx + 1);
      }
    }
  }

  return content;
}

function injectAppInit(content) {
  if (content.includes('initGeorgeOrchestra')) return content;

  const ttsPatterns = ['georgeSpeak', 'speakText', 'textToSpeech', 'handleSpeak', 'onSpeak', 'TTS.speak', 'Speech.speak'];
  let ttsCall = '(text) => console.log("[orchestra TTS]", text)';
  for (const pat of ttsPatterns) {
    if (content.includes(pat)) {
      ttsCall = `(text) => { try { ${pat}(text); } catch(e) { console.log("[orchestra]", text); } }`;
      break;
    }
  }

  const initBlock = `
  // @george-orchestra-init
  useEffect(() => {
    initGeorgeOrchestra(${ttsCall}).catch(console.error);
  }, []);`;

  if (!content.includes("from 'react'") && !content.includes('from "react"')) {
    content = `import { useEffect } from 'react';\n` + content;
  } else if (!content.includes('useEffect')) {
    content = content.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/,
      (m, imports) => {
        if (imports.includes('useEffect')) return m;
        return `import { ${imports.trim()}, useEffect } from 'react'`;
      }
    );
  }

  const funcMatch = content.match(/function App\s*\([^)]*\)\s*\{/);
  if (funcMatch) {
    const idx = content.indexOf(funcMatch[0]) + funcMatch[0].length;
    return content.slice(0, idx) + initBlock + content.slice(idx);
  }

  return content;
}

function injectPromptHook(content) {
  if (content.includes('@george-orchestra-prompt')) return content;

  const patterns = [
    /return\s+(`[\s\S]*?`|'[\s\S]*?'|"[\s\S]*?")\s*;?\s*\n(\s*\})/,
    /(const\s+(?:systemPrompt|SYSTEM_PROMPT|basePrompt)\s*=\s*)([`'"])/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return content.replace(
        /(const\s+(systemPrompt|SYSTEM_PROMPT|basePrompt)\s*=\s*)([^;]+);/,
        `$1getOrchestraPromptAddition($3); // @george-orchestra-prompt`
      );
    }
  }
  return content;
}

let patched = 0;
const files = findSpeechFiles();

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  content = addImport(content, file, GEORGE_ROOT);
  if (file.endsWith('App.tsx')) {
    content = injectAppInit(content);
  } else {
    content = injectSpeechHook(content);
  }
  content = injectPromptHook(content);

  if (content !== original) {
    writeFileSync(file, content);
    console.log(`Patched: ${file}`);
    patched++;
  }
}

if (patched === 0) {
  console.log('No files patched. Creating manual hook file...');
  const hookFile = join(GEORGE_ROOT, 'orchestra', 'MANUAL_HOOK.ts');
  writeFileSync(hookFile, `// Add this to your speech handler manually:
import { handleOrchestraInput } from './george-bridge';

export async function georgeSpeechPipeline(text: string) {
  const result = await handleOrchestraInput(text);
  if (result.handled) return;
  // ... existing George logic
}
`);
  console.log(`Created: ${hookFile}`);
}

console.log(`Done. Patched ${patched} file(s).`);
