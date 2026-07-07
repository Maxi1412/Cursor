import { useState } from 'react';
import { FolderOpen, Check } from 'lucide-react';
import type { Mode } from '@mediadeck/types';
import { BottomSheet } from '../../components/BottomSheet';

interface AddCategorySheetProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSave: (name: string) => void;
}

/** New-category sheet: name + the NAS folder it will allocate. */
export function AddCategorySheet({ open, mode, onClose, onSave }: AddCategorySheetProps) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const folderRoot = mode === 'tv' ? 'T:\\TV Shows\\' : 'M:\\Movies\\';

  const close = () => {
    setName('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close}>
      <div className="md-sheet-title md-disp" style={{ padding: '4px 0 6px' }}>
        New {mode === 'tv' ? 'TV' : 'movie'} category
      </div>
      <div className="md-sec-sub" style={{ lineHeight: 1.5 }}>
        Name it and point it at a folder on your NAS. It gets scanned, indexed, and shown here — same
        as adding a library in DS Video Station.
      </div>
      <div className="md-flabel">Category name</div>
      <input
        className="md-input"
        autoFocus
        placeholder={mode === 'tv' ? 'e.g. Horror TV Shows' : 'e.g. Documentary'}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="md-flabel">Library folder</div>
      <div className="md-folder">
        <FolderOpen size={16} />
        {folderRoot + (trimmed || '…')}
      </div>
      <button
        className="md-save"
        disabled={!trimmed}
        onClick={() => {
          onSave(trimmed);
          setName('');
        }}
      >
        <Check size={17} /> Save &amp; scan folder
      </button>
    </BottomSheet>
  );
}
