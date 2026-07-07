import { useState } from 'react';
import type { InventoryItem } from '@mediadeck/types';
import { TopStatus } from './features/shell/TopStatus';
import { BottomNav } from './features/shell/BottomNav';
import type { TabId } from './features/shell/types';
import { SignalTab } from './features/signal/SignalTab';
import { LibraryTab } from './features/library/LibraryTab';
import { SchedulesTab } from './features/schedules/SchedulesTab';
import { ActivityTab } from './features/activity/ActivityTab';
import { DeckTab } from './features/deck/DeckTab';
import { DetailSheet } from './features/library/DetailSheet';
import { SettingsOverlay } from './features/settings/SettingsOverlay';

export default function App() {
  const [tab, setTab] = useState<TabId>('signal');
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="md-root">
      <div className="md-phone md-app">
        <TopStatus onOpenSettings={() => setSettingsOpen(true)} />

        <div className={`md-body ${tab === 'assistant' ? 'chat' : ''}`}>
          {tab === 'signal' && <SignalTab onOpenItem={setSelected} />}
          {tab === 'library' && <LibraryTab onOpenItem={setSelected} />}
          {tab === 'schedules' && <SchedulesTab />}
          {tab === 'activity' && <ActivityTab />}
          {tab === 'assistant' && <DeckTab />}
        </div>

        <DetailSheet item={selected} onClose={() => setSelected(null)} />

        {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} />}

        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </div>
  );
}
