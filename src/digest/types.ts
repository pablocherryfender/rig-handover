export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string;
  runs: number;
  retries: number;
  lastStatus: DigestStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type DigestNight = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

export type DigestResult = DigestNight;

export { readNight } from './reader.js';
