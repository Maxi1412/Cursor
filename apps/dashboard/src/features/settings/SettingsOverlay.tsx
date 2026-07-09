import { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { FEATURE_META, ALL_OFF, type Capability, type Mode } from '@mediadeck/types';
import {
  useFeatures,
  useCatCfg,
  useAppState,
  useCollection,
  useSystem,
  useToggleFeature,
  useToggleCatCfg,
} from '../../lib/queries';
import { CAP_ICON } from '../../lib/icons';
import { Toggle } from '../../components/Toggle';
import { StatusChip } from '../../components/StatusChip';
import { mergeCats, baseCats } from '../../lib/constants';

interface SettingsOverlayProps {
  onClose: () => void;
}

export function SettingsOverlay({ onClose }: SettingsOverlayProps) {
  const { data: features } = useFeatures();
  const { data: collection } = useCollection();
  const { data: system } = useSystem();
  const [openCat, setOpenCat] = useState<string | null>(null);

  const toggleFeature = useToggleFeature();
  const masters = features?.features ?? ALL_OFF;

  const tvCats = mergeCats(baseCats('tv'), collection?.tv.cats.map((c) => c.name) ?? []);
  const movieCats = mergeCats(baseCats('movies'), collection?.movies.cats.map((c) => c.name) ?? []);

  return (
    <div className="md-settings">
      <div className="md-set-top">
        <ArrowLeft size={22} onClick={onClose} style={{ cursor: 'pointer' }} />
        <b>Settings</b>
      </div>
      <div className="md-set-body">
        <div className="md-sec-sub" style={{ lineHeight: 1.5, marginBottom: 2 }}>
          Set up what the system does here. Anything you enable shows in Schedules, then acts on the
          categories you switch on below.
        </div>

        {/* ---- Automations (feature masters) ---- */}
        <div className="md-set-group">Automations</div>
        <div className="md-set-cat">
          {FEATURE_META.map((f) => {
            const Ic = CAP_ICON[f.key];
            const on = masters[f.key];
            return (
              <div key={f.key} className="md-catrow">
                <div className="md-catrow-l">
                  <div className="md-catrow-ic" style={on ? { color: f.color } : undefined}>
                    <Ic size={16} />
                  </div>
                  <div className="md-catrow-tx">
                    <b>{f.name}</b>
                    <span>{f.desc}</span>
                  </div>
                </div>
                <Toggle
                  on={on}
                  color={f.color}
                  onChange={() => toggleFeature.mutate({ key: f.key, on: !on })}
                />
              </div>
            );
          })}
        </div>
        <div className="md-sec-sub" style={{ lineHeight: 1.5, margin: '2px 2px 0' }}>
          Turn a feature on here, then choose which categories it runs on below. Enabled features
          appear in Schedules.
        </div>

        {/* ---- TV Shows ---- */}
        <div className="md-set-group">TV Shows</div>
        {tvCats.map((c) => (
          <SettingsCategory
            key={`tv:${c}`}
            mode="tv"
            cat={c}
            open={openCat === `tv:${c}`}
            onToggleOpen={() => setOpenCat((k) => (k === `tv:${c}` ? null : `tv:${c}`))}
          />
        ))}

        {/* ---- Movies ---- */}
        <div className="md-set-group">Movies</div>
        {movieCats.map((c) => (
          <SettingsCategory
            key={`movies:${c}`}
            mode="movies"
            cat={c}
            open={openCat === `movies:${c}`}
            onToggleOpen={() => setOpenCat((k) => (k === `movies:${c}` ? null : `movies:${c}`))}
          />
        ))}

        {/* ---- System ---- */}
        <div className="md-set-group">System</div>
        <div className="md-chips" style={{ marginTop: 0 }}>
          {(system?.chips ?? []).map((chip) => (
            <StatusChip key={chip.key} variant={chip.ok ? 'ok' : 'default'}>
              {chip.label}
              {chip.mode === 'mock' ? ' · mock' : ''}
            </StatusChip>
          ))}
        </div>
        {system?.warnings && system.warnings.length > 0 && (
          <div className="md-chips">
            {system.warnings.map((w) => (
              <StatusChip key={w}>{w}</StatusChip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingsCategoryProps {
  mode: Mode;
  cat: string;
  open: boolean;
  onToggleOpen: () => void;
}

function SettingsCategory({ mode, cat, open, onToggleOpen }: SettingsCategoryProps) {
  const { data: catCfg } = useCatCfg();
  const { data: features } = useFeatures();
  const { data: state } = useAppState();
  const toggleCat = useToggleCatCfg();

  const key = `${mode}:${cat}`;
  const cfg = catCfg?.catCfg[key] ?? ALL_OFF;
  const masters = features?.features ?? ALL_OFF;
  const pending = state?.pending[key] ?? [];

  const rows = FEATURE_META.filter((f) => !(f.tvOnly && mode !== 'tv')).map((f) => ({
    ...f,
    label: f.key === 'releases' && mode === 'tv' ? 'New seasons' : f.name,
  }));
  const onDots = rows.filter((f) => cfg[f.key]);

  return (
    <div className="md-set-cat">
      <div className="md-set-cathead" onClick={onToggleOpen}>
        <div className="l">
          <b>{cat}</b>
          <div className="md-set-dots">
            {onDots.map((f) => (
              <i key={f.key} style={{ background: f.color }} />
            ))}
          </div>
        </div>
        <ChevronDown size={18} className={`md-set-chev ${open ? 'open' : ''}`} />
      </div>
      {open &&
        rows.map((f) => {
          const Ic = CAP_ICON[f.key];
          const on = cfg[f.key];
          const isPending = on && (!masters[f.key] || pending.includes(f.key as Capability));
          return (
            <div key={f.key} className="md-catrow">
              <div className="md-catrow-l">
                <div className="md-catrow-ic" style={on ? { color: f.color } : undefined}>
                  <Ic size={16} />
                </div>
                <div className="md-catrow-tx">
                  <b>{f.label}</b>
                  {isPending && (
                    <span style={{ color: 'var(--signal)' }}>
                      Turn on {f.name} in the main settings to start
                    </span>
                  )}
                </div>
              </div>
              <Toggle
                on={on}
                color={f.color}
                onChange={() => toggleCat.mutate({ mode, cat, key: f.key, on: !on })}
              />
            </div>
          );
        })}
    </div>
  );
}
