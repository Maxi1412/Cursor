import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mapDsStatus, mapDsTask, mapQbState, mapQbTorrent, RealDownloadStation, RealQbittorrent } from './real.js';

describe('mapping helpers (pure)', () => {
  it('maps Synology task statuses honestly', () => {
    expect(mapDsStatus('finished')).toBe('completed');
    expect(mapDsStatus('seeding')).toBe('seeding');
    expect(mapDsStatus('paused')).toBe('paused');
    expect(mapDsStatus('error')).toBe('failed');
    expect(mapDsStatus('hash_checking')).toBe('downloading'); // unmapped -> conservative default
  });

  it('computes DS task percent from size/downloaded, floors at 0 when size unknown', () => {
    const t = mapDsTask({
      id: 'ds1', title: 'X', status: 'downloading', size: 1000,
      additional: { detail: { destination: 'movies/Action' }, transfer: { size_downloaded: 250 } },
    });
    expect(t.pct).toBe(25);
    expect(t.dest).toBe('movies/Action');
    const noSize = mapDsTask({ id: 'ds2', title: 'Y', status: 'waiting' });
    expect(noSize.pct).toBe(0);
  });

  it('maps qBittorrent states honestly', () => {
    expect(mapQbState('downloading')).toBe('downloading');
    expect(mapQbState('stalledUP')).toBe('seeding');
    expect(mapQbState('pausedUP')).toBe('completed');
    expect(mapQbState('pausedDL')).toBe('paused');
    expect(mapQbState('error')).toBe('failed');
  });

  it('computes qBittorrent percent from progress (0..1 -> 0..100)', () => {
    const t = mapQbTorrent({ hash: 'abc', name: 'X', state: 'downloading', progress: 0.42 });
    expect(t.pct).toBe(42);
    expect(t.extId).toBe('abc');
  });
});

describe('RealDownloadStation against a fake Synology-shaped server', () => {
  let server: Server;
  let baseUrl: string;
  afterEach(() => server?.close());

  it('logs in, lists tasks, and creates a task using the shared-folder-relative dest', async () => {
    const seen: string[] = [];
    server = createServer((req, res) => {
      const url = new URL(req.url!, 'http://x');
      seen.push(`${url.pathname}?${url.searchParams.get('method')}`);
      res.setHeader('content-type', 'application/json');
      if (url.pathname === '/webapi/auth.cgi') {
        res.end(JSON.stringify({ success: true, data: { sid: 'FAKESID' } }));
        return;
      }
      if (url.pathname === '/webapi/DownloadStation/task.cgi' && url.searchParams.get('method') === 'list') {
        res.end(
          JSON.stringify({
            success: true,
            data: {
              tasks: [
                {
                  id: 'dsid1', title: 'Furiosa', status: 'downloading', size: 2000,
                  additional: { detail: { destination: 'movies/Action' }, transfer: { size_downloaded: 1000 } },
                },
              ],
            },
          }),
        );
        return;
      }
      if (url.pathname === '/webapi/DownloadStation/task.cgi' && url.searchParams.get('method') === 'create') {
        expect(url.searchParams.get('destination')).toBe('movies/Action'); // no leading slash
        expect(url.searchParams.get('_sid')).toBe('FAKESID');
        res.end(JSON.stringify({ success: true }));
        return;
      }
      res.statusCode = 404;
      res.end('{}');
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;
    baseUrl = `http://127.0.0.1:${port}`;

    const ds = new RealDownloadStation(baseUrl, 'max', 'secret');
    expect(await ds.ping()).toBe(true);

    const tasks = await ds.listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ extId: 'dsid1', title: 'Furiosa', state: 'downloading', pct: 50 });

    // per the DSM 7.2 quirk: pass a LEADING-SLASH dest and confirm it's stripped
    await ds.addTask('magnet:?xt=furiosa', '/movies/Action');
    expect(seen).toContain('/webapi/DownloadStation/task.cgi?create');
  });

  it('re-logs in once when the SID goes stale, then succeeds', async () => {
    let listCalls = 0;
    server = createServer((req, res) => {
      const url = new URL(req.url!, 'http://x');
      res.setHeader('content-type', 'application/json');
      if (url.pathname === '/webapi/auth.cgi') {
        res.end(JSON.stringify({ success: true, data: { sid: `SID-${Date.now()}` } }));
        return;
      }
      if (url.searchParams.get('method') === 'list') {
        listCalls++;
        if (listCalls === 1) {
          res.end(JSON.stringify({ success: false, error: { code: 119 } })); // stale SID
        } else {
          res.end(JSON.stringify({ success: true, data: { tasks: [] } }));
        }
        return;
      }
      res.statusCode = 404;
      res.end('{}');
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;
    const ds = new RealDownloadStation(`http://127.0.0.1:${port}`, 'max', 'secret');
    const tasks = await ds.listTasks();
    expect(tasks).toEqual([]);
    expect(listCalls).toBe(2); // failed once, re-logged in, succeeded
  });
});

describe('RealQbittorrent against a fake qBittorrent-shaped server', () => {
  let server: Server;
  afterEach(() => server?.close());

  it('logs in via the SID cookie and lists/adds torrents', async () => {
    server = createServer((req, res) => {
      const url = new URL(req.url!, 'http://x');
      if (url.pathname === '/api/v2/auth/login') {
        res.setHeader('Set-Cookie', 'SID=QBSID; Path=/');
        res.end('Ok.');
        return;
      }
      if (url.pathname === '/api/v2/torrents/info') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify([{ hash: 'h1', name: 'Furiosa', state: 'downloading', progress: 0.5 }]));
        return;
      }
      if (url.pathname === '/api/v2/torrents/add') {
        expect(req.headers.cookie).toBe('SID=QBSID');
        res.end('Ok.');
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;
    const qb = new RealQbittorrent(`http://127.0.0.1:${port}`, 'admin', 'adminadmin');

    expect(await qb.ping()).toBe(true);
    const tasks = await qb.listTasks();
    expect(tasks[0]).toMatchObject({ extId: 'h1', title: 'Furiosa', state: 'downloading', pct: 50 });
    await qb.addTask('magnet:?xt=furiosa', 'tv-sonarr');
  });
});
