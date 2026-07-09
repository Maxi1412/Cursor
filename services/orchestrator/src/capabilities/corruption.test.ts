import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { probeFile } from './corruption.js';

/** A fake ffprobe child process the test fully controls. */
function fakeChild(stdout: string, exitCode: number, stderr = ''): ChildProcessWithoutNullStreams {
  const child = new EventEmitter() as unknown as ChildProcessWithoutNullStreams;
  const out = new EventEmitter();
  const err = new EventEmitter();
  (child as any).stdout = out;
  (child as any).stderr = err;
  queueMicrotask(() => {
    if (stdout) out.emit('data', Buffer.from(stdout));
    if (stderr) err.emit('data', Buffer.from(stderr));
    (child as unknown as EventEmitter).emit('close', exitCode);
  });
  return child;
}

const goodProbe = JSON.stringify({
  streams: [{ codec_type: 'video' }, { codec_type: 'audio' }],
  format: { duration: '120.5' },
});

describe('corruption probeFile', () => {
  it('passes a file with an audio stream and real duration', async () => {
    const res = await probeFile('/x.mkv', () => fakeChild(goodProbe, 0));
    expect(res.ok).toBe(true);
  });

  it('flags a file with no audio stream', async () => {
    const noAudio = JSON.stringify({ streams: [{ codec_type: 'video' }], format: { duration: '120' } });
    const res = await probeFile('/x.mkv', () => fakeChild(noAudio, 0));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/no audio/);
  });

  it('flags a file with zero/invalid duration as likely truncated', async () => {
    const zeroDur = JSON.stringify({ streams: [{ codec_type: 'audio' }], format: { duration: '0' } });
    const res = await probeFile('/x.mkv', () => fakeChild(zeroDur, 0));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/truncated/);
  });

  it('flags a non-zero ffprobe exit as broken', async () => {
    const res = await probeFile('/x.mkv', () => fakeChild('', 1, 'Invalid data found'));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/exited 1/);
  });

  it('is honest (does not flag) when ffprobe itself is unavailable', async () => {
    const res = await probeFile('/x.mkv', () => {
      throw new Error('spawn ffprobe ENOENT');
    });
    expect(res.ok).toBe(true);
    expect(res.reason).toMatch(/not available/);
  });
});
