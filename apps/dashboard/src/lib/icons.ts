import {
  Zap,
  Languages,
  Gauge,
  Disc3,
  Copy,
  AlertTriangle,
  FolderInput,
  Download,
  RefreshCw,
  AlertCircle,
  Tv,
  ArrowUp,
  type LucideIcon,
} from 'lucide-react';
import type { Capability, NotificationEvent } from '@mediadeck/types';

/** Capability → lucide icon (FEATURE_META carries color/name but not the icon). */
export const CAP_ICON: Record<Capability, LucideIcon> = {
  grab: Zap,
  subs: Languages,
  quality: Gauge,
  releases: Disc3,
  dup: Copy,
  corrupt: AlertTriangle,
  organize: FolderInput,
};

/** Activity feed icon + colors per notification event (prototype's activity map). */
export interface ActivityStyle {
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const ACTIVITY_STYLE: Record<NotificationEvent, ActivityStyle> = {
  grab: { icon: Download, color: 'var(--live)', bg: 'var(--live-dim)' },
  'new-episode': { icon: Zap, color: 'var(--signal)', bg: 'var(--signal-dim)' },
  scan: { icon: RefreshCw, color: '#8B7CF0', bg: 'rgba(139,124,240,.14)' },
  missing: { icon: AlertCircle, color: 'var(--alert)', bg: 'var(--alert-dim)' },
  claude: { icon: Tv, color: '#37D9C4', bg: 'var(--live-dim)' },
  subtitle: { icon: Languages, color: '#8B7CF0', bg: 'rgba(139,124,240,.15)' },
  upgrade: { icon: ArrowUp, color: '#4FA8FF', bg: 'rgba(79,168,255,.15)' },
  'new-release': { icon: Disc3, color: '#EC6AC8', bg: 'rgba(236,106,200,.15)' },
};
