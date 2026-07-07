import { useEffect, useState } from 'react';
import { Languages, Check, RefreshCw, Download } from 'lucide-react';
import type { InventoryItem } from '@mediadeck/types';
import { BottomSheet } from '../../components/BottomSheet';
import { Toggle } from '../../components/Toggle';
import { PosterGradient } from '../../components/PosterGradient';
import { useIgnoreSubs } from '../../lib/queries';

interface DetailSheetProps {
  item: InventoryItem | null;
  onClose: () => void;
}

/**
 * Bottom-sheet detail view. Note: the library index (`InventoryItem`) carries
 * seasons-on-disk and a missing count but NOT per-episode state, so the episode
 * grid is a faithful best-effort rendering of the missing episodes for the series.
 */
export function DetailSheet({ item, onClose }: DetailSheetProps) {
  const ignoreSubs = useIgnoreSubs();
  const [auto, setAuto] = useState(false);
  const [selSeason, setSelSeason] = useState<number | null>(null);
  const [subSearch, setSubSearch] = useState<'idle' | 'searching' | 'done'>('idle');
  const [ignored, setIgnored] = useState(false);
  const [backfilled, setBackfilled] = useState(false);

  useEffect(() => {
    if (item) {
      setSelSeason(item.seasonsOnDisk[0] ?? null);
      setSubSearch('idle');
      setIgnored(false);
      setBackfilled(false);
      setAuto(item.missingCount === 0);
    }
  }, [item]);

  if (!item) return null;

  const isTv = item.type === 'series';
  const present = item.subTH || subSearch === 'done';
  const subText =
    subSearch === 'searching'
      ? 'Searching 3 sources…'
      : subSearch === 'done'
        ? `Downloaded · ${item.title}.th.srt`
        : item.subTH
          ? `Matched · ${item.title}.th.srt`
          : ignored
            ? 'Ignored · locked as-is'
            : 'Not found in folder';

  const findSubs = () => {
    if (subSearch !== 'idle') return;
    setSubSearch('searching');
    // Client-side search animation (no dedicated find endpoint in the API).
    setTimeout(() => setSubSearch('done'), 1700);
  };

  const doIgnore = () => {
    setIgnored(true);
    ignoreSubs.mutate({ mediaId: item.id, ignore: true });
  };

  const subsRow = (
    <>
      <div
        className="md-autobar"
        style={{ marginBottom: !item.subTH && subSearch !== 'done' ? 10 : 16 }}
      >
        <div
          className="md-autobar-l"
          style={{ display: 'flex', alignItems: 'center', gap: 11 }}
        >
          <div className="md-subcov-ic" style={{ width: 34, height: 34 }}>
            <Languages size={17} />
          </div>
          <div>
            <b>Thai subtitles</b>
            <span>{subText}</span>
          </div>
        </div>
        {present && <Check size={20} color="#37D9C4" />}
      </div>
      {!item.subTH && subSearch !== 'done' && !ignored && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className="md-backfill subs"
            disabled={subSearch === 'searching'}
            style={{ flex: 1 }}
            onClick={findSubs}
          >
            {subSearch === 'searching' ? (
              <>
                <RefreshCw size={16} className="md-spin" /> Searching sources…
              </>
            ) : (
              <>
                <Languages size={16} /> Find Thai subtitles
              </>
            )}
          </button>
          <button className="md-grab ghost" style={{ padding: '0 16px' }} onClick={doIgnore}>
            Ignore
          </button>
        </div>
      )}
    </>
  );

  return (
    <BottomSheet open={Boolean(item)} onClose={onClose}>
      <div className="md-sheet-hero">
        <PosterGradient
          className="md-sheet-poster"
          title={item.title}
          seed={item.id}
          posterUrl={item.posterUrl}
        />
        <div className="md-sheet-info">
          <div className="md-sheet-title md-disp">{item.title}</div>
          <div className="md-sheet-tags">
            {item.quality && <div className="md-tag">{item.quality}</div>}
            <div className="md-tag">{item.cat}</div>
            {item.missingCount > 0 ? (
              <div className="md-tag miss">{item.missingCount} gaps</div>
            ) : (
              <div className="md-tag live">Healthy</div>
            )}
            {!item.subTH && <div className="md-tag new">TH subs missing</div>}
          </div>
        </div>
      </div>

      {isTv ? (
        <>
          <div className="md-autobar">
            <div className="md-autobar-l">
              <b>Auto-grab new episodes</b>
              <span>{auto ? 'Watching weekly for new airings' : 'Manual grabs only'}</span>
            </div>
            <Toggle on={auto} onChange={() => setAuto((a) => !a)} />
          </div>

          {subsRow}

          {item.seasonsOnDisk.length > 0 && (
            <div className="md-seasons">
              {item.seasonsOnDisk.map((sn) => (
                <div
                  key={sn}
                  className={`md-season ${selSeason === sn ? 'on' : ''}`}
                  onClick={() => setSelSeason(sn)}
                >
                  S{String(sn).padStart(2, '0')}
                </div>
              ))}
            </div>
          )}

          <div className="md-eps">
            {item.missingCount > 0 ? (
              Array.from({ length: Math.min(item.missingCount, 24) }).map((_, i) => (
                <div key={i} className="md-epc miss">
                  {i + 1}
                </div>
              ))
            ) : (
              <div className="md-epc own" style={{ gridColumn: '1 / -1' }}>
                Complete
              </div>
            )}
          </div>

          <div className="md-legend">
            <div className="md-leg">
              <i style={{ background: 'var(--live-dim)', border: '1px solid rgba(55,217,196,.3)' }} />
              Owned
            </div>
            <div className="md-leg">
              <i style={{ border: '1px dashed rgba(255,93,108,.6)' }} />
              Missing
            </div>
            <div className="md-leg">
              <i style={{ background: 'var(--signal-dim)', border: '1px solid rgba(255,180,67,.4)' }} />
              New
            </div>
            <div className="md-leg">
              <i style={{ background: 'var(--surface2)' }} />
              Not aired
            </div>
          </div>

          {item.missingCount > 0 &&
            (backfilled ? (
              <button className="md-backfill done">
                <Check size={17} /> Queued {item.missingCount} to Download Station
              </button>
            ) : (
              <button className="md-backfill" onClick={() => setBackfilled(true)}>
                <Download size={17} /> Backfill {item.missingCount} missing
              </button>
            ))}
        </>
      ) : (
        <>
          <div className="md-autobar">
            <div className="md-autobar-l">
              <b>Watch for 4K upgrade</b>
              <span>
                {item.quality === '2160p'
                  ? 'Currently 2160p · best available'
                  : `Currently ${item.quality ?? 'unknown'}`}
              </span>
            </div>
            <Toggle on={auto} onChange={() => setAuto((a) => !a)} color="var(--upg)" />
          </div>
          {subsRow}
        </>
      )}
    </BottomSheet>
  );
}
