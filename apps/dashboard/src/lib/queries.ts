import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Capability, Mode } from '@mediadeck/types';
import {
  api,
  type CatCfgResponse,
  type CollectionResponse,
  type DeckMemoryResponse,
  type DownloadsResponse,
  type FeaturesResponse,
  type HealthFindingsResponse,
  type LibraryResponse,
  type NotificationsResponse,
  type SchedulesResponse,
  type SignalResponse,
  type StateResponse,
  type SystemResponse,
} from './api';

/** Central query-key registry. */
export const qk = {
  system: ['system'] as const,
  features: ['features'] as const,
  catCfg: ['catCfg'] as const,
  state: ['state'] as const,
  library: (mode: Mode) => ['library', mode] as const,
  collection: ['collection'] as const,
  signal: ['signal'] as const,
  schedules: ['schedules'] as const,
  downloads: ['downloads'] as const,
  notifications: ['notifications'] as const,
  health: ['health'] as const,
  deckMemory: ['deckMemory'] as const,
};

/* ------------------------------ queries ------------------------------ */

export const useSystem = (): UseQueryResult<SystemResponse> =>
  useQuery({ queryKey: qk.system, queryFn: api.system, refetchInterval: 30_000 });

export const useFeatures = (): UseQueryResult<FeaturesResponse> =>
  useQuery({ queryKey: qk.features, queryFn: api.features });

export const useCatCfg = (): UseQueryResult<CatCfgResponse> =>
  useQuery({ queryKey: qk.catCfg, queryFn: api.catCfg });

export const useAppState = (): UseQueryResult<StateResponse> =>
  useQuery({ queryKey: qk.state, queryFn: api.state });

export const useLibrary = (mode: Mode): UseQueryResult<LibraryResponse> =>
  useQuery({ queryKey: qk.library(mode), queryFn: () => api.library(mode) });

export const useCollection = (): UseQueryResult<CollectionResponse> =>
  useQuery({ queryKey: qk.collection, queryFn: api.collection });

export const useSignal = (): UseQueryResult<SignalResponse> =>
  useQuery({ queryKey: qk.signal, queryFn: api.signal });

export const useSchedules = (): UseQueryResult<SchedulesResponse> =>
  useQuery({ queryKey: qk.schedules, queryFn: api.schedules });

export const useDownloads = (): UseQueryResult<DownloadsResponse> =>
  useQuery({ queryKey: qk.downloads, queryFn: api.downloads, refetchInterval: 15_000 });

export const useNotifications = (): UseQueryResult<NotificationsResponse> =>
  useQuery({ queryKey: qk.notifications, queryFn: api.notifications });

export const useHealthFindings = (): UseQueryResult<HealthFindingsResponse> =>
  useQuery({ queryKey: qk.health, queryFn: api.healthFindings });

export const useDeckMemory = (): UseQueryResult<DeckMemoryResponse> =>
  useQuery({ queryKey: qk.deckMemory, queryFn: api.deckMemory });

/* ----------------------------- mutations ----------------------------- */

/** Invalidate everything that derives from the two-tier feature × catCfg state. */
function useInvalidateState(): () => void {
  const qc = useQueryClient();
  return () => {
    for (const key of [
      qk.features,
      qk.catCfg,
      qk.state,
      qk.schedules,
      qk.signal,
    ]) {
      void qc.invalidateQueries({ queryKey: key });
    }
  };
}

export function useToggleFeature() {
  const invalidate = useInvalidateState();
  return useMutation({
    mutationFn: ({ key, on }: { key: Capability; on: boolean }) => api.setFeature(key, on),
    onSuccess: invalidate,
  });
}

export function useToggleCatCfg() {
  const invalidate = useInvalidateState();
  return useMutation({
    mutationFn: ({ mode, cat, key, on }: { mode: Mode; cat: string; key: Capability; on: boolean }) =>
      api.setCatCfg(mode, cat, key, on),
    onSuccess: invalidate,
  });
}

export function useHealthAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ignore' | 'resolve' }) =>
      api.healthAction(id, action),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.health });
      void qc.invalidateQueries({ queryKey: qk.signal });
    },
  });
}

export function useIgnoreSubs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, ignore }: { mediaId: string; ignore: boolean }) =>
      ignore ? api.ignoreSubs(mediaId) : api.unignoreSubs(mediaId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.signal }),
  });
}

export function useDeckChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api.deckChat(message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.deckMemory }),
  });
}

export function useClearDeckMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearDeckMemory(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.deckMemory }),
  });
}
