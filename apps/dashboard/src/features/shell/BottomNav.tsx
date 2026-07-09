import {
  Radio,
  LayoutGrid,
  SlidersHorizontal,
  Activity as ActivityIcon,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { TabId } from './types';

interface NavItem {
  id: TabId;
  label: string;
  Ic: LucideIcon;
  center?: boolean;
}

const ITEMS: NavItem[] = [
  { id: 'signal', label: 'Signal', Ic: Radio },
  { id: 'library', label: 'Library', Ic: LayoutGrid },
  { id: 'assistant', label: 'Deck', Ic: Sparkles, center: true },
  { id: 'schedules', label: 'Schedules', Ic: SlidersHorizontal },
  { id: 'activity', label: 'Activity', Ic: ActivityIcon },
];

interface BottomNavProps {
  tab: TabId;
  onChange: (tab: TabId) => void;
}

/** The 5-tab bottom nav with the raised center Deck orb. */
export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <div className="md-nav">
      {ITEMS.map((t) =>
        t.center ? (
          <div
            key={t.id}
            className={`md-tab center ${tab === t.id ? 'on' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <div className="md-tab-orb">
              <t.Ic size={21} />
            </div>
            <span>{t.label}</span>
          </div>
        ) : (
          <div
            key={t.id}
            className={`md-tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <t.Ic size={21} />
            <span>{t.label}</span>
            <div className="md-tab-ind" />
          </div>
        ),
      )}
    </div>
  );
}
