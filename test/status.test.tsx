import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board', () => {
  it('shows the lane banner, nights on disk as links, and status counts', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a> · 10 ok · 4 retry · 1 fail');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a> · 7 ok · 0 retry · 0 fail');
  });

  it('linked digests render successfully', async () => {
    const app = createApp(config);

    const res28 = await app.request('/digest/2026-10-28');
    expect(res28.status).toBe(200);
    const html28 = await res28.text();
    expect(html28).toContain('digest 2026-10-28');

    const res27 = await app.request('/digest/2026-10-27');
    expect(res27.status).toBe(200);
    const html27 = await res27.text();
    expect(html27).toContain('digest 2026-10-27');
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
