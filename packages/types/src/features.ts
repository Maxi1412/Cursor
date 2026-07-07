import { z } from 'zod';
import { Capability, CAPABILITIES } from './common.js';

/**
 * A map from every capability to a boolean. Used for both the feature masters
 * (`features/state`) and a per-category toggle set (`catCfg/{mode:cat}`).
 */
export const CapabilityFlags = z.object(
  Object.fromEntries(CAPABILITIES.map((k) => [k, z.boolean()])) as Record<
    Capability,
    z.ZodBoolean
  >,
) as z.ZodObject<Record<Capability, z.ZodBoolean>>;
export type CapabilityFlags = Record<Capability, boolean>;

/** Every capability off — the default for a brand-new install and every new category. */
export const ALL_OFF: CapabilityFlags = Object.fromEntries(
  CAPABILITIES.map((k) => [k, false]),
) as CapabilityFlags;

/** `features/state` — the global master switches. Everything off by default. */
export const FeatureState = CapabilityFlags;
export type FeatureState = CapabilityFlags;

/** `catCfg/{mode:cat}` — one category's toggles (incl. the `{mode}:All` scope). */
export const CategoryConfig = CapabilityFlags;
export type CategoryConfig = CapabilityFlags;

/** Human-facing metadata for a capability, shared by Settings / Schedules / Signal. */
export interface FeatureMeta {
  key: Capability;
  name: string;
  desc: string;
  /** UI accent (CSS var name), matching the prototype's concern colors. */
  color: string;
  /** Cadence label shown in Schedules. */
  freq: string;
  /** True when the capability only applies to TV. */
  tvOnly: boolean;
}

/** Ordered feature metadata — mirrors the prototype's FEATURES array. */
export const FEATURE_META: readonly FeatureMeta[] = [
  { key: 'grab', name: 'Auto-grab new episodes', desc: 'New episodes as they air', color: 'var(--live)', freq: 'Every 30 min', tvOnly: true },
  { key: 'subs', name: 'Thai subtitles', desc: 'Find, download & rename to .th.srt', color: 'var(--violet)', freq: 'Live · daily', tvOnly: false },
  { key: 'quality', name: 'Quality upgrades', desc: 'Flag below 1080p · approve upgrades', color: 'var(--upg)', freq: 'Weekly', tvOnly: false },
  { key: 'releases', name: 'New releases', desc: 'Films on DVD/digital · new seasons', color: 'var(--rel)', freq: 'Daily', tvOnly: false },
  { key: 'dup', name: 'Duplicate scan', desc: 'Repeated titles across folders', color: 'var(--muted)', freq: 'Weekly', tvOnly: false },
  { key: 'corrupt', name: 'Corruption scan', desc: 'No-audio, broken or unplayable files', color: 'var(--alert)', freq: 'Weekly', tvOnly: false },
  { key: 'organize', name: 'Organization scan', desc: 'Misfiled titles · ignore to lock in place', color: 'var(--muted)', freq: 'Monthly', tvOnly: false },
] as const;

export const Capability_ = Capability; // re-export convenience
