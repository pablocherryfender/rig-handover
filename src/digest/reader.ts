import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestNight, DigestRow, DigestStatus } from './types.js';

export function readNight(runsDir: string, night: string): DigestNight | null {
  const nightName = night.endsWith('.jsonl') ? night.slice(0, -6) : night;
  const fileName = night.endsWith('.jsonl') ? night : `${night}.jsonl`;
  const filePath = join(runsDir, fileName);

  if (!existsSync(filePath)) {
    return null;
  }

  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const lines = content.split(/\r?\n/);
  const rowsMap = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        badLines++;
        continue;
      }
    } catch {
      badLines++;
      continue;
    }

    const { at, job, status, owner, error } = parsed;
    if (
      typeof at !== 'string' ||
      typeof job !== 'string' ||
      typeof status !== 'string' ||
      (status !== 'ok' && status !== 'retry' && status !== 'fail')
    ) {
      badLines++;
      continue;
    }

    const ownerStr = typeof owner === 'string' && owner.trim() !== '' ? owner : '—';
    const errorStr = typeof error === 'string' && error.trim() !== '' ? error : null;
    const digestStatus = status as DigestStatus;

    const existing = rowsMap.get(job);
    if (!existing) {
      rowsMap.set(job, {
        job,
        owner: ownerStr,
        runs: 1,
        retries: status === 'retry' ? 1 : 0,
        lastStatus: digestStatus,
        lastError: errorStr,
        firstAt: at,
        lastAt: at,
      });
    } else {
      existing.runs += 1;
      if (status === 'retry') {
        existing.retries += 1;
      }
      existing.lastStatus = digestStatus;
      if (errorStr !== null) {
        existing.lastError = errorStr;
      }
      existing.lastAt = at;
      if (ownerStr !== '—') {
        existing.owner = ownerStr;
      }
    }
  }

  return {
    night: nightName,
    rows: Array.from(rowsMap.values()).sort((a, b) => a.job.localeCompare(b.job)),
    badLines,
  };
}
