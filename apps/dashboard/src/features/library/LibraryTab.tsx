import { useMemo, useState } from 'react';
import { Tv, Film, Search, Plus } from 'lucide-react';
import type { InventoryItem, Mode } from '@mediadeck/types';
import { useLibrary } from '../../lib/queries';
import { PosterGradient } from '../../components/PosterGradient';
import { CategoryControlPanel } from './CategoryControlPanel';
import { AddCategorySheet } from './AddCategorySheet';
import { itemStatus, itemSubLabel } from '../../lib/display';
import { mergeCats, baseCats } from '../../lib/constants';

interface LibraryTabProps {
  onOpenItem: (item: InventoryItem) => void;
}

export function LibraryTab({ onOpenItem }: LibraryTabProps) {
  const [mode, setMode] = useState<Mode>('tv');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [customCats, setCustomCats] = useState<Record<Mode, string[]>>({ tv: [], movies: [] });

  const { data } = useLibrary(mode);
  const items = useMemo(() => data?.items ?? [], [data]);

  const liveCats = useMemo(() => items.map((i) => i.cat), [items]);
  const cats = useMemo(
    () => ['All', ...mergeCats(baseCats(mode), [...liveCats, ...customCats[mode]])],
    [mode, liveCats, customCats],
  );

  const shown = items.filter(
    (i) =>
      (filter === 'All' || i.cat === filter) &&
      (!query || i.title.toLowerCase().includes(query.toLowerCase())),
  );

  const switchMode = (m: Mode) => {
    setMode(m);
    setFilter('All');
  };

  return (
    <div className="md-sec">
      <div className="md-sec-head">
        <div>
          <div className="md-sec-title md-disp">Library</div>
          <div className="md-sec-sub">
            {mode === 'tv' ? `${items.length} shows · T:\\` : `${items.length} movies · M:\\`}
          </div>
        </div>
        <div className="md-seg">
          <button className={mode === 'tv' ? 'on' : ''} onClick={() => switchMode('tv')}>
            <Tv size={13} /> TV
          </button>
          <button className={mode === 'movies' ? 'on' : ''} onClick={() => switchMode('movies')}>
            <Film size={13} /> Movies
          </button>
        </div>
      </div>

      <div className="md-search">
        <Search size={17} />
        <input
          placeholder={`Search ${mode === 'tv' ? 'shows' : 'movies'}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="md-filters">
        {cats.map((c) => (
          <div
            key={c}
            className={`md-filt ${filter === c ? 'on' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </div>
        ))}
        <div className="md-filt add" onClick={() => setAddOpen(true)}>
          <Plus size={12} /> Add
        </div>
      </div>

      <CategoryControlPanel mode={mode} cat={filter} titleCount={shown.length} />

      {shown.length ? (
        <div className="md-grid">
          {shown.map((s) => (
            <div key={s.id} className="md-cell" onClick={() => onOpenItem(s)}>
              <PosterGradient className="md-cell-poster" title={s.title} seed={s.id} posterUrl={s.posterUrl}>
                <div className={`md-ring ${itemStatus(s)}`} />
                {!s.subTH && <div className="md-subflag">TH</div>}
              </PosterGradient>
              <div className="md-cell-title">{s.title}</div>
              <div className="md-cell-sub">{itemSubLabel(s)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="md-empty">
          <Search size={34} />
          <p>
            No titles match that.
            <br />
            Try another category.
          </p>
        </div>
      )}

      <AddCategorySheet
        open={addOpen}
        mode={mode}
        onClose={() => setAddOpen(false)}
        onSave={(name) => {
          setCustomCats((c) => ({ ...c, [mode]: [...c[mode], name] }));
          setFilter(name);
          setAddOpen(false);
        }}
      />
    </div>
  );
}
