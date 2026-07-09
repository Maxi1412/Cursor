import { Settings, Bell, Server, HardDrive, RefreshCw } from 'lucide-react';
import { useSystem } from '../../lib/queries';
import { StatusChip } from '../../components/StatusChip';

interface TopStatusProps {
  onOpenSettings: () => void;
}

/** Top status strip: brand, gear, bell, and NAS/path/scan chips from /api/system. */
export function TopStatus({ onOpenSettings }: TopStatusProps) {
  const { data } = useSystem();
  const nasOnline = data?.nas ?? false;
  const storage = data?.storage;

  return (
    <div className="md-top">
      <div className="md-top-row">
        <div className="md-brand">
          <div className="md-brand-dot" />
          <div className="md-brand-name md-disp">
            MEDIA<b>DECK</b>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <Settings
            size={18}
            color="#7B879B"
            style={{ cursor: 'pointer' }}
            onClick={onOpenSettings}
            aria-label="Settings"
          />
          <Bell size={18} color="#7B879B" aria-label="Notifications" />
        </div>
      </div>
      <div className="md-chips">
        <StatusChip variant={nasOnline ? 'ok' : 'default'} icon={<Server size={12} />}>
          {nasOnline ? 'NAS online' : 'NAS offline'}
        </StatusChip>
        <StatusChip variant="path" icon={<HardDrive size={12} />}>
          {storage ? `${storage} · direct` : 'Desktop · direct'}
        </StatusChip>
        <StatusChip icon={<RefreshCw size={11} />}>
          {data ? 'Live' : 'Connecting…'}
        </StatusChip>
      </div>
    </div>
  );
}
