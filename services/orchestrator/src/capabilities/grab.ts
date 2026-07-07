import type { CapabilityModule, RunContext, CapabilityResult } from './base.js';
import { scopedItems, emptyResult } from './base.js';

/**
 * Auto-grab new episodes (TV only). Sonarr is the monitor; this reconciles which
 * enabled series should be monitored/auto-grabbed vs manual.
 */
export const grab: CapabilityModule = {
  key: 'grab',
  cadence: 'Every 30 min',
  async run(rc: RunContext): Promise<CapabilityResult> {
    const res = emptyResult('grab');
    const items = scopedItems(rc, 'grab').filter((i) => i.type === 'series');
    res.considered = items.length;
    // TODO(phase-7): set Sonarr monitoring per series; surface newly-aired episodes to Signal.
    res.notes.push(`${items.length} enabled series would be monitored for new airings.`);
    return res;
  },
};
