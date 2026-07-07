import { Zap, Languages, Gauge, Disc3 } from 'lucide-react';
import type { Capability, CapabilityFlags, Mode } from '@mediadeck/types';
import { ALL_OFF } from '@mediadeck/types';
import { Toggle } from '../../components/Toggle';
import { useCatCfg, useToggleCatCfg } from '../../lib/queries';

interface CategoryControlPanelProps {
  mode: Mode;
  cat: string;
  titleCount: number;
}

interface Row {
  key: Capability;
  icon: typeof Zap;
  color: string;
  dimBg: string;
  title: string;
  desc: string;
  tvOnly?: boolean;
}

/** The per-category feature toggles shown atop the Library grid (`.md-catctl`). */
export function CategoryControlPanel({ mode, cat, titleCount }: CategoryControlPanelProps) {
  const { data } = useCatCfg();
  const toggle = useToggleCatCfg();
  const scopeKey = `${mode}:${cat}`;
  const cfg: CapabilityFlags = data?.catCfg[scopeKey] ?? ALL_OFF;
  const scopeLabel = cat === 'All' ? (mode === 'tv' ? 'All TV shows' : 'All movies') : cat;

  const rows: Row[] = [
    {
      key: 'grab',
      icon: Zap,
      color: 'var(--live)',
      dimBg: 'var(--live-dim)',
      title: 'Auto-grab new episodes',
      desc: 'Whole folder, as they air',
      tvOnly: true,
    },
    {
      key: 'subs',
      icon: Languages,
      color: 'var(--violet)',
      dimBg: 'rgba(139,124,240,.15)',
      title: 'Thai subtitles',
      desc: 'Find, download & rename to .th.srt',
    },
    {
      key: 'quality',
      icon: Gauge,
      color: 'var(--upg)',
      dimBg: 'var(--upg-dim)',
      title: 'Quality upgrades',
      desc: 'Flag below 1080p · you approve each',
    },
    {
      key: 'releases',
      icon: Disc3,
      color: 'var(--rel)',
      dimBg: 'var(--rel-dim)',
      title: mode === 'tv' ? 'New shows & seasons' : 'New releases',
      desc: mode === 'tv' ? 'Flag when a new season drops' : 'Flag when out on DVD/digital',
    },
  ];

  return (
    <div className="md-catctl">
      <div className="md-catctl-head">
        <b>{scopeLabel}</b>
        <span>{titleCount} titles</span>
      </div>
      {rows
        .filter((r) => !(r.tvOnly && mode !== 'tv'))
        .map((r) => {
          const Ic = r.icon;
          const on = cfg[r.key];
          return (
            <div key={r.key} className="md-catrow">
              <div className="md-catrow-l">
                <div
                  className="md-catrow-ic"
                  style={on ? { background: r.dimBg, color: r.color } : undefined}
                >
                  <Ic size={16} />
                </div>
                <div className="md-catrow-tx">
                  <b>{r.title}</b>
                  <span>{r.desc}</span>
                </div>
              </div>
              <Toggle
                on={on}
                color={r.color}
                onChange={() => toggle.mutate({ mode, cat, key: r.key, on: !on })}
              />
            </div>
          );
        })}
    </div>
  );
}
