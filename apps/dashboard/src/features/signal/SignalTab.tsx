import { useState } from 'react';
import {
  Film,
  Tv,
  Languages,
  ChevronRight,
  Zap,
  Download,
  Check,
  Plus,
  AlertCircle,
  ArrowUp,
  Copy,
  AlertTriangle,
  FolderInput,
  type LucideIcon,
} from 'lucide-react';
import type { InventoryItem, HealthFinding, HealthKind } from '@mediadeck/types';
import { useCollection, useSignal, useHealthAction } from '../../lib/queries';
import { useProgress } from '../../hooks/useProgress';
import { SignalCard } from './SignalCard';
import { PosterGradient } from '../../components/PosterGradient';
import { itemContext } from '../../lib/display';

interface SignalTabProps {
  onOpenItem: (item: InventoryItem) => void;
}

type OverviewKey = 'movies' | 'tv';
const OVERVIEW_ACCENT: Record<OverviewKey, { accent: string; dim: string }> = {
  movies: { accent: '#8B7CF0', dim: 'rgba(139,124,240,.16)' },
  tv: { accent: '#37D9C4', dim: 'rgba(55,217,196,.16)' },
};

export function SignalTab({ onOpenItem }: SignalTabProps) {
  const { data: collection } = useCollection();
  const { data: signal } = useSignal();
  const { start, progress } = useProgress();
  const healthAction = useHealthAction();

  const [overview, setOverview] = useState<OverviewKey | null>(null);

  const total = collection?.total ?? 0;
  const sub = collection?.subCoverage ?? { have: 0, total: 0 };
  const subPct = sub.total ? Math.round((sub.have / sub.total) * 100) : 0;

  const newSignals = signal?.newSignals ?? [];
  const releases = signal?.releases ?? [];
  const missing = signal?.needsAttention.missing ?? [];
  const subsMissing = signal?.needsAttention.subsMissing ?? [];
  const upgrades = signal?.upgrades ?? [];
  const health = signal?.health ?? [];

  return (
    <div className="md-sec">
      {/* ---- Collection overview ---- */}
      <div className="md-sec-head">
        <div>
          <div className="md-sec-title md-disp">Collection</div>
          <div className="md-sec-sub">Full library scan</div>
        </div>
        <div className="md-count">{total.toLocaleString()} TITLES</div>
      </div>

      <div className="md-ov">
        {(['movies', 'tv'] as OverviewKey[]).map((k) => {
          const section = collection?.[k];
          const on = overview === k;
          const { accent, dim } = OVERVIEW_ACCENT[k];
          return (
            <div
              key={k}
              className="md-ovc"
              style={
                on
                  ? {
                      borderColor: accent + '66',
                      background: `linear-gradient(140deg, ${dim}, var(--surface) 60%)`,
                    }
                  : undefined
              }
              onClick={() => setOverview(on ? null : k)}
            >
              <div className="md-ovc-ic" style={on ? { color: accent } : undefined}>
                {k === 'movies' ? <Film size={13} /> : <Tv size={13} />}{' '}
                {k === 'movies' ? 'Movies' : 'TV Shows'}
              </div>
              <div className="md-ovc-num" style={on ? { color: accent } : undefined}>
                {section?.total ?? 0}
              </div>
              <div className="md-ovc-foot">
                <span>{section?.cats.length ?? 0} categories</span>
                <ChevronRight size={14} className={`md-ovc-chev${on ? ' on' : ''}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Thai subtitle coverage ---- */}
      <div className="md-subcov">
        <div className="md-subcov-ic">
          <Languages size={18} />
        </div>
        <div className="md-subcov-mid">
          <div className="md-subcov-top">
            <b>Thai subtitles</b>
            <span>
              {subPct}% · {sub.total - sub.have} missing
            </span>
          </div>
          <div className="md-subcov-bar">
            <i style={{ width: `${subPct}%` }} />
          </div>
        </div>
      </div>

      {/* ---- Category breakdown ---- */}
      {overview &&
        (() => {
          const section = collection?.[overview];
          if (!section) return null;
          const max = Math.max(1, ...section.cats.map((c) => c.n));
          const accent = OVERVIEW_ACCENT[overview].accent;
          return (
            <div className="md-bd">
              <div className="md-bd-head">
                <b>{overview === 'movies' ? 'Movies' : 'TV shows'} by category</b>
                <span>{section.total} total</span>
              </div>
              {section.cats.map((c) => (
                <div key={c.name} className="md-bd-row">
                  <div className="md-bd-name">{c.name}</div>
                  <div className="md-bd-track">
                    <div
                      className="md-bd-fill"
                      style={{ width: `${(c.n / max) * 100}%`, background: accent }}
                    />
                  </div>
                  <div className="md-bd-n">{c.n}</div>
                </div>
              ))}
            </div>
          );
        })()}

      {/* ---- New signals ---- */}
      <div className="md-sec-head">
        <div>
          <div className="md-sec-title md-disp">New signals</div>
          <div className="md-sec-sub">Episodes aired &amp; ready to grab</div>
        </div>
        <div className="md-count">{newSignals.length} LIVE</div>
      </div>
      {newSignals.length === 0 && (
        <div className="md-sec-sub" style={{ padding: '2px 2px 10px' }}>
          Nothing aired right now — new episodes appear here as they drop.
        </div>
      )}
      {newSignals.map((s) => {
        const p = progress[s.id];
        const done = p !== undefined && p >= 100;
        return (
          <SignalCard
            key={s.id}
            live
            title={s.title}
            seed={s.id}
            posterUrl={s.posterUrl}
            context={itemContext(s)}
            onClick={() => onOpenItem(s)}
            meta={
              p !== undefined && !done ? (
                <div className="md-prog">
                  <i style={{ width: `${p}%` }} />
                </div>
              ) : (
                <div className="md-sig-meta">
                  <span className="md-ep">{s.quality ?? 'New'}</span>
                </div>
              )
            }
            right={
              <div className="md-sig-right" onClick={(e) => e.stopPropagation()}>
                <div className="md-tally" />
                {done ? (
                  <div className="md-grab done">
                    <Check size={15} /> Sent
                  </div>
                ) : p !== undefined ? (
                  <div className="md-grab auto">
                    <Download size={13} /> {Math.round(p)}%
                  </div>
                ) : (
                  <button className="md-grab auto" onClick={() => start(s.id)}>
                    <Zap size={13} /> Grab
                  </button>
                )}
              </div>
            }
          />
        );
      })}

      {/* ---- New releases (gated) ---- */}
      {releases.length > 0 && (
        <>
          <div className="md-sec-head" style={{ marginTop: 24 }}>
            <div>
              <div className="md-sec-title md-disp">New releases</div>
              <div className="md-sec-sub">Out of cinemas · now on disc/digital</div>
            </div>
            <div className="md-count" style={{ color: 'var(--rel)' }}>
              {releases.length} NEW
            </div>
          </div>
          {releases.map((r) => {
            const p = progress[r.id];
            const done = p !== undefined && p >= 100;
            return (
              <SignalCard
                key={r.id}
                title={r.title}
                seed={r.id}
                posterUrl={r.posterUrl}
                context={r.cat}
                meta={
                  done ? (
                    <div className="md-sig-meta" style={{ color: 'var(--live)' }}>
                      <Check size={13} /> <span>Added to library</span>
                    </div>
                  ) : p !== undefined ? (
                    <div className="md-prog" style={{ width: 96 }}>
                      <i style={{ width: `${p}%`, background: 'var(--rel)' }} />
                    </div>
                  ) : (
                    <div className="md-sig-meta" style={{ color: 'var(--rel)' }}>
                      Now available · {r.quality ?? '2160p'}
                    </div>
                  )
                }
                right={
                  <div className="md-sig-right">
                    {done ? (
                      <div className="md-grab upg-done">
                        <Check size={15} /> Added
                      </div>
                    ) : p !== undefined ? (
                      <div className="md-grab rel">
                        <Download size={13} /> {Math.round(p)}%
                      </div>
                    ) : (
                      <button className="md-grab rel" onClick={() => start(r.id)}>
                        <Plus size={13} /> Add
                      </button>
                    )}
                  </div>
                }
              />
            );
          })}
        </>
      )}

      {/* ---- Needs attention ---- */}
      <div className="md-sec-head" style={{ marginTop: 24 }}>
        <div>
          <div className="md-sec-title md-disp">Needs attention</div>
          <div className="md-sec-sub">Gaps found in your archive</div>
        </div>
      </div>
      {missing.length === 0 && subsMissing.length === 0 && (
        <div className="md-sec-sub" style={{ padding: '2px 2px 10px' }}>
          Nothing needs you — your archive is complete.
        </div>
      )}
      {missing.map((s) => (
        <SignalCard
          key={s.id}
          title={s.title}
          seed={s.id}
          posterUrl={s.posterUrl}
          context={itemContext(s)}
          onClick={() => onOpenItem(s)}
          meta={
            <div className="md-sig-meta" style={{ color: 'var(--alert)' }}>
              <AlertCircle size={13} /> <span>{s.missingCount} missing episodes</span>
            </div>
          }
          right={
            <div className="md-sig-right">
              <ChevronRight size={18} color="#7B879B" />
            </div>
          }
        />
      ))}
      {subsMissing.map((s) => (
        <SignalCard
          key={s.id + '-sub'}
          title={s.title}
          seed={s.id}
          posterUrl={s.posterUrl}
          context={itemContext(s)}
          onClick={() => onOpenItem(s)}
          meta={
            <div className="md-sig-meta" style={{ color: 'var(--violet)' }}>
              <Languages size={13} /> <span>Thai subtitles missing</span>
            </div>
          }
          right={
            <div className="md-sig-right">
              <ChevronRight size={18} color="#7B879B" />
            </div>
          }
        />
      ))}

      {/* ---- Quality upgrades (gated) ---- */}
      {upgrades.length > 0 && (
        <>
          <div className="md-sec-head" style={{ marginTop: 24 }}>
            <div>
              <div className="md-sec-title md-disp">Quality upgrades</div>
              <div className="md-sec-sub">Below 1080p · you approve each swap</div>
            </div>
            <div className="md-count" style={{ color: 'var(--upg)' }}>
              {upgrades.length} FOUND
            </div>
          </div>
          {upgrades.map((q) => {
            const p = progress[q.id];
            const done = p !== undefined && p >= 100;
            return (
              <SignalCard
                key={q.id}
                title={q.title}
                seed={q.id}
                posterUrl={q.posterUrl}
                context={q.cat}
                meta={
                  done ? (
                    <div className="md-sig-meta" style={{ color: 'var(--live)' }}>
                      <Check size={13} /> <span>Swapped · old → Recycle Bin</span>
                    </div>
                  ) : p !== undefined ? (
                    <div className="md-prog" style={{ width: 96 }}>
                      <i style={{ width: `${p}%`, background: 'var(--upg)' }} />
                    </div>
                  ) : (
                    <div className="md-sig-meta" style={{ color: 'var(--upg)' }}>
                      {q.quality ?? 'SD'} → 1080p
                    </div>
                  )
                }
                right={
                  <div className="md-sig-right">
                    {done ? (
                      <div className="md-grab upg-done">
                        <Check size={15} /> Done
                      </div>
                    ) : p !== undefined ? (
                      <div className="md-grab upg">
                        <Download size={13} /> {Math.round(p)}%
                      </div>
                    ) : (
                      <button className="md-grab upg" onClick={() => start(q.id)}>
                        <ArrowUp size={13} /> Update
                      </button>
                    )}
                  </div>
                }
              />
            );
          })}
        </>
      )}

      {/* ---- Library health (gated) ---- */}
      {health.length > 0 && (
        <>
          <div className="md-sec-head" style={{ marginTop: 24 }}>
            <div>
              <div className="md-sec-title md-disp">Library health</div>
              <div className="md-sec-sub">Duplicates · broken files · misfiled</div>
            </div>
            <div className="md-count">{health.length} FLAGGED</div>
          </div>
          {health.map((h) => (
            <HealthRow
              key={h.id}
              finding={h}
              onResolve={() => healthAction.mutate({ id: h.id, action: 'resolve' })}
              onIgnore={() => healthAction.mutate({ id: h.id, action: 'ignore' })}
            />
          ))}
        </>
      )}
    </div>
  );
}

const HEALTH_META: Record<HealthKind, { icon: LucideIcon; color: string; label: string; act: string }> = {
  dup: { icon: Copy, color: 'var(--muted)', label: 'Duplicate', act: 'Remove dupe' },
  corrupt: { icon: AlertTriangle, color: 'var(--alert)', label: 'Broken file', act: 'Re-download' },
  organize: { icon: FolderInput, color: 'var(--muted)', label: 'Misfiled', act: 'Move' },
};

function HealthRow({
  finding,
  onResolve,
  onIgnore,
}: {
  finding: HealthFinding;
  onResolve: () => void;
  onIgnore: () => void;
}) {
  const meta = HEALTH_META[finding.kind];
  const Ic = meta.icon;
  return (
    <div className="md-sig">
      <PosterGradient className="md-poster" title={finding.title} seed={finding.id} />
      <div className="md-sig-mid">
        <div className="md-sig-net">{meta.label}</div>
        <div className="md-sig-title">{finding.title}</div>
        <div className="md-sig-meta" style={{ color: meta.color }}>
          <Ic size={13} /> <span>{finding.detail}</span>
        </div>
      </div>
      <div className="md-sig-right" style={{ gap: 6, justifyContent: 'center' }}>
        {finding.kind === 'organize' && (
          <button className="md-grab ghost" onClick={onIgnore}>
            Ignore
          </button>
        )}
        <button
          className="md-grab"
          style={finding.kind === 'corrupt' ? { background: 'var(--alert)', color: '#fff' } : undefined}
          onClick={onResolve}
        >
          {meta.act}
        </button>
      </div>
    </div>
  );
}
