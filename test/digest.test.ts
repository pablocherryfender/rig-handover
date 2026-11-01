import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('run log reader', () => {
  it('reads runs/2026-10-28.jsonl (5 jobs, 1 bad line)', () => {
    const result = readNight('runs', '2026-10-28');
    expect(result).not.toBeNull();
    expect(result?.night).toBe('2026-10-28');
    expect(result?.badLines).toBe(1);
    expect(result?.rows).toHaveLength(5);

    const rows = result!.rows;
    const byJob = new Map(rows.map((r) => [r.job, r]));

    // 1. rig/rotate-logs
    const rotate = byJob.get('rig/rotate-logs');
    expect(rotate).toBeDefined();
    expect(rotate).toEqual({
      job: 'rig/rotate-logs',
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:02+01:00',
      lastAt: '2026-10-28T23:00:02+01:00',
    });

    // 2. lane/sync
    const sync = byJob.get('lane/sync');
    expect(sync).toBeDefined();
    expect(sync).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });

    // 3. fixtures/refresh
    const refresh = byJob.get('fixtures/refresh');
    expect(refresh).toBeDefined();
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });

    // 4. notes/backup
    const backup = byJob.get('notes/backup');
    expect(backup).toBeDefined();
    expect(backup).toEqual({
      job: 'notes/backup',
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      firstAt: '2026-10-29T04:00:01+01:00',
      lastAt: '2026-10-29T04:00:01+01:00',
    });

    // 5. digest/render (owner is null in log line, parsed as '—')
    const render = byJob.get('digest/render');
    expect(render).toBeDefined();
    expect(render).toEqual({
      job: 'digest/render',
      owner: '—',
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T05:41:09+01:00',
      lastAt: '2026-10-29T05:41:09+01:00',
    });
  });

  it('returns null for non-existent night file', () => {
    const result = readNight('runs', '1999-01-01');
    expect(result).toBeNull();
  });
});

describe('digest JSON API', () => {
  it('GET /api/digest/2026-10-28 returns digest JSON with jobs sorted by name', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.night).toBe('2026-10-28');
    expect(json.badLines).toBe(1);
    expect(json.rows).toHaveLength(5);

    const jobNames = json.rows.map((r: { job: string }) => r.job);
    expect(jobNames).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('GET /api/digest/1999-01-01 returns 404', async () => {
    const res = await createApp(config).request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
  });
});
