import type { Config } from '@mediadeck/config';
import type { Adapters } from './types.js';
import { MockSonarr, MockProwlarr, MockTmdb, MockDownloadStation, MockQbittorrent, MockNtfy } from './mock.js';
import { RealSonarr, RealProwlarr, RealTmdb, RealDownloadStation, RealQbittorrent, RealNtfy } from './real.js';

export * from './types.js';

/** Build the adapter set from config — each is `real` only when mode=real AND ready. */
export function createAdapters(config: Config): Adapters {
  const a = config.adapters;
  return {
    sonarr:
      a.sonarr.ready && a.sonarr.url && a.sonarr.apiKey
        ? new RealSonarr(a.sonarr.url, a.sonarr.apiKey)
        : new MockSonarr(),
    prowlarr:
      a.prowlarr.ready && a.prowlarr.url && a.prowlarr.apiKey
        ? new RealProwlarr(a.prowlarr.url, a.prowlarr.apiKey)
        : new MockProwlarr(),
    tmdb: a.tmdb.ready && a.tmdb.readToken ? new RealTmdb(a.tmdb.readToken) : new MockTmdb(),
    downloadStation:
      a.downloadStation.ready && a.downloadStation.url && a.downloadStation.user
        ? new RealDownloadStation(
            a.downloadStation.url,
            a.downloadStation.user,
            a.downloadStation.pass ?? '',
          )
        : new MockDownloadStation(),
    qbittorrent:
      a.qbittorrent.ready && a.qbittorrent.url
        ? new RealQbittorrent(a.qbittorrent.url, a.qbittorrent.user, a.qbittorrent.pass)
        : new MockQbittorrent(),
    ntfy:
      a.ntfy.ready && a.ntfy.url && a.ntfy.topic
        ? new RealNtfy(a.ntfy.url, a.ntfy.topic)
        : new MockNtfy(),
  };
}
