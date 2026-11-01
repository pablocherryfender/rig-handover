import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightSummary = {
  night: string;
  ok: number;
  retry: number;
  fail: number;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function nightSummary(runsDir: string, night: string): NightSummary {
  const digest = readNight(runsDir, night);
  if (!digest) {
    return { night, ok: 0, retry: 0, fail: 0 };
  }

  let ok = 0;
  let retry = 0;
  let fail = 0;

  for (const row of digest.rows) {
    retry += row.retries;
    if (row.lastStatus === 'fail') {
      fail += 1;
    }
    ok += row.runs - row.retries - (row.lastStatus === 'fail' ? 1 : 0);
  }

  return { night: digest.night, ok, retry, fail };
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir).map((night) => nightSummary(config.runsDir, night));

  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
  };
}
