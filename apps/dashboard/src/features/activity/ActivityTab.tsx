import { Activity as ActivityIcon } from 'lucide-react';
import { useNotifications } from '../../lib/queries';
import { ACTIVITY_STYLE } from '../../lib/icons';

/** Chronological typed log from /api/notifications (newest first). */
export function ActivityTab() {
  const { data } = useNotifications();
  const notifications = data?.notifications ?? [];

  return (
    <div className="md-sec">
      <div className="md-sec-head">
        <div>
          <div className="md-sec-title md-disp">Activity</div>
          <div className="md-sec-sub">What the system did, newest first</div>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="md-empty">
          <ActivityIcon size={34} />
          <p>
            No activity yet.
            <br />
            Actions the system takes will show up here.
          </p>
        </div>
      ) : (
        notifications.map((a) => {
          const style = ACTIVITY_STYLE[a.event];
          const Ic = style.icon;
          const detail = [a.episode, a.detail].filter(Boolean).join(' · ');
          return (
            <div key={a.id} className="md-act">
              <div className="md-act-ic" style={{ background: style.bg, color: style.color }}>
                <Ic size={16} />
              </div>
              <div className="md-act-body">
                <div className="md-act-title">{a.title}</div>
                {detail && <div className="md-act-sub">{detail}</div>}
              </div>
              <div className="md-act-time">{relativeTime(a.ts)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0 || !Number.isFinite(diff)) return '';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
