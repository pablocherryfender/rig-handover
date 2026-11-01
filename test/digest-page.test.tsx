import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const tempRunsDir = join(process.cwd(), 'test-runs-tmp');

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: tempRunsDir,
};

describe('digest page route', () => {
  beforeAll(() => {
    mkdirSync(tempRunsDir, { recursive: true });
    writeFileSync(join(tempRunsDir, 'empty.jsonl'), '');
    writeFileSync(
      join(tempRunsDir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
        '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
        '{"at":"2026-10-29T01:31:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
        '{"at":"2026-10-29T01:33:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
        '{"at":"2026-10-29T04:00:01+01:00","job":"notes/backup","status":"fail","owner":"lane-07","error":"quota exceeded"}',
        '{"at":"2026-10-29T05:41:09+01:00","job":"digest/render","status":"ok","owner":null}',
      ].join('\n'),
    );
  });

  afterAll(() => {
    rmSync(tempRunsDir, { recursive: true, force: true });
  });

  it('renders digest page for existing night sorted by job', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain('digest 2026-10-28');
    expect(html).toContain('rig/rotate-logs');
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('notes/backup');
    expect(html).toContain('digest/render');

    // Jobs should be in alphabetical order
    const digestIndex = html.indexOf('digest/render');
    const fixturesIndex = html.indexOf('fixtures/refresh');
    const notesIndex = html.indexOf('notes/backup');
    const rotateIndex = html.indexOf('rig/rotate-logs');

    expect(digestIndex).toBeLessThan(fixturesIndex);
    expect(fixturesIndex).toBeLessThan(notesIndex);
    expect(notesIndex).toBeLessThan(rotateIndex);

    // retries >= 3 marked with warn class
    expect(html).toMatch(/<td class="warn">3<\/td>/);

    // fail status marked with warn class
    expect(html).toMatch(/<td class="warn">fail<\/td>/);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(config).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty file', async () => {
    const res = await createApp(config).request('/digest/empty');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nothing ran');
  });
});
