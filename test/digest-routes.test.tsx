import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('digest route tests (2a and 2b)', () => {
  let tempRunsDir: string;
  let config: { adapter: string; installed: string; beatEverySeconds: number; runsDir: string };

  beforeAll(() => {
    tempRunsDir = mkdtempSync(join(tmpdir(), 'rig-runs-test-'));
    config = {
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir: tempRunsDir,
    };

    // Valid night file
    writeFileSync(
      join(tempRunsDir, '2026-10-28.jsonl'),
      '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}\n',
    );

    // Empty night file
    writeFileSync(join(tempRunsDir, 'empty.jsonl'), '');

    // Night file with a bad line
    writeFileSync(
      join(tempRunsDir, 'bad-line.jsonl'),
      [
        '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
        'THIS IS A BAD LINE THAT CANNOT BE PARSED',
      ].join('\n'),
    );
  });

  afterAll(() => {
    rmSync(tempRunsDir, { recursive: true, force: true });
  });

  describe('2a: GET /digest/:night (HTML)', () => {
    it('returns 200 for a valid night', async () => {
      const res = await createApp(config).request('/digest/2026-10-28');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('digest 2026-10-28');
      expect(html).toContain('rig/rotate-logs');
    });

    it('returns 404 for a night with no file', async () => {
      const res = await createApp(config).request('/digest/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 200 with "nothing ran" for an empty night', async () => {
      const res = await createApp(config).request('/digest/empty');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('nothing ran');
    });

    it('returns 200 for a night with a bad line', async () => {
      const res = await createApp(config).request('/digest/bad-line');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('rig/rotate-logs');
    });
  });

  describe('2b: GET /api/digest/:night (JSON)', () => {
    it('returns 200 with digest JSON for a valid night', async () => {
      const res = await createApp(config).request('/api/digest/2026-10-28');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.night).toBe('2026-10-28');
      expect(json.badLines).toBe(0);
      expect(json.rows).toHaveLength(1);
      expect(json.rows[0].job).toBe('rig/rotate-logs');
    });

    it('returns 404 for a night with no file', async () => {
      const res = await createApp(config).request('/api/digest/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 200 with empty rows for an empty night', async () => {
      const res = await createApp(config).request('/api/digest/empty');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.night).toBe('empty');
      expect(json.badLines).toBe(0);
      expect(json.rows).toHaveLength(0);
    });

    it('returns 200 with badLines count for a night with a bad line', async () => {
      const res = await createApp(config).request('/api/digest/bad-line');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.night).toBe('bad-line');
      expect(json.badLines).toBe(1);
      expect(json.rows).toHaveLength(1);
      expect(json.rows[0].job).toBe('rig/rotate-logs');
    });
  });
});
