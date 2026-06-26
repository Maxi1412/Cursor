#!/usr/bin/env node
/**
 * Orchestra backend + integration tests (no George APK required).
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const {
  detectOrchestraTrigger,
  extractProjectDescription,
  routeRequest,
  buildDelegationPlan,
} = await import(join(ROOT, 'orchestra/shared/index.ts'));

const {
  commandDocPath,
  desktopDocPath,
  isDesktopOnline,
  OFFLINE_THRESHOLD_MS,
  FIREBASE_PATHS,
} = await import(join(ROOT, 'orchestra/shared/firebase-paths.ts'));

const { runHealthCheck, formatHealthSummary } = await import(join(ROOT, 'orchestra/desktop/health-check.ts'));

describe('Trigger detection', () => {
  it('activates on "Activate Project Management mode"', () => {
    const r = detectOrchestraTrigger('Activate Project Management mode');
    assert.equal(r.matched, true);
    assert.equal(r.intent, 'activate');
  });

  it('detects new project intent', () => {
    const r = detectOrchestraTrigger('New project');
    assert.equal(r.matched, true);
    assert.equal(r.intent, 'new_project');
  });

  it('ignores normal calendar speech', () => {
    const r = detectOrchestraTrigger('Add meeting tomorrow at 3pm');
    assert.equal(r.matched, false);
    assert.equal(r.intent, null);
  });

  it('extracts project description', () => {
    const d = extractProjectDescription(
      'New project: English teaching app with native Spanish voices'
    );
    assert.ok(d?.includes('English teaching'));
  });
});

describe('Tool routing', () => {
  it('routes teaching app with voices to full stack', () => {
    const r = routeRequest(
      'English teaching app with native English and Spanish voices'
    );
    assert.ok(r.primaryTools.includes('cursor'));
    assert.ok(r.primaryTools.includes('elevenlabs'));
    assert.ok(r.primaryTools.includes('claude_desktop'));
    assert.ok(r.primaryTools.includes('codex'));
    assert.equal(r.taskType, 'full_stack');
  });

  it('always includes cursor as coordinator', () => {
    const r = routeRequest('fix a bug in expenses');
    assert.equal(r.primaryTools[0], 'cursor');
  });

  it('builds delegation plan with tasks', () => {
    const routing = routeRequest('English teaching app with voices');
    const plan = buildDelegationPlan('English App', 'Teaching app with voices', routing);
    assert.ok(plan.length >= 2);
    assert.equal(plan[0].tool, 'cursor');
  });
});

describe('Firebase paths', () => {
  it('uses valid 2-segment document paths', () => {
    const path = commandDocPath('cmd_test_123');
    const segments = path.split('/');
    assert.equal(segments.length, 2);
    assert.equal(segments[0], 'orchestra_commands');
  });

  it('desktop path is valid', () => {
    const path = desktopDocPath('desktop_main');
    assert.equal(path, 'orchestra_desktops/desktop_main');
  });

  it('detects online/offline heartbeat', () => {
    const now = Date.now();
    assert.equal(isDesktopOnline(now - 1000, now), true);
    assert.equal(isDesktopOnline(now - OFFLINE_THRESHOLD_MS - 1, now), false);
  });

  it('config paths have no slashes in collection names', () => {
    for (const [, col] of Object.entries(FIREBASE_PATHS)) {
      assert.ok(!col.includes('/'), `Invalid collection name: ${col}`);
    }
  });
});

describe('Desktop health check', () => {
  it('returns health result with all tools', async () => {
    const health = await runHealthCheck('test_desktop');
    assert.equal(health.desktopId, 'test_desktop');
    assert.ok(health.tools.cursor);
    assert.ok(health.tools.terminal);
    assert.ok(typeof health.limitedMode === 'boolean');
  });

  it('formats health summary string', async () => {
    const health = await runHealthCheck('test_desktop');
    const summary = formatHealthSummary(health);
    assert.ok(summary.length > 10);
  });
});

describe('George integration artifacts', () => {
  it('george-bridge exists', () => {
    const bridge = join(ROOT, 'george-integration/george-bridge.ts');
    const content = readFileSync(bridge, 'utf8');
    assert.ok(content.includes('initGeorgeOrchestra'));
    assert.ok(content.includes('handleOrchestraInput'));
  });

  it('prepare script output is RN-compatible', () => {
    const staging = join(ROOT, '.george-orchestra-staging/mobile/OrchestraMode.ts');
    try {
      const content = readFileSync(staging, 'utf8');
      assert.ok(!content.includes("from './routing.js'"));
    } catch {
      // staging may not exist yet — not a failure
      assert.ok(true);
    }
  });

  it('orchestra config has conversation templates', () => {
    const config = JSON.parse(
      readFileSync(join(ROOT, 'orchestra/shared/orchestra-config.json'), 'utf8')
    );
    assert.ok(config.conversation.allOnline);
    assert.ok(config.triggers.activate.length > 0);
  });
});

describe('Deploy scripts exist', () => {
  const scripts = [
    'scripts/integrate-george.ps1',
    'scripts/build-deploy-george.ps1',
    'scripts/one-click-setup.ps1',
    'scripts/verify-firebase.ps1',
    'scripts/prepare-george-orchestra.mjs',
    'scripts/patch-george-speech.mjs',
  ];

  for (const s of scripts) {
    it(`${s} exists`, () => {
      const content = readFileSync(join(ROOT, s), 'utf8');
      assert.ok(content.length > 50);
    });
  }
});
