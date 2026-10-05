// Polite HTTP helper: at most one request every 2 seconds, identifiable user agent.
import { execFileSync } from 'node:child_process';

export const USER_AGENT = 'i-muslim-ingest/0.1 (research; max 1 request per 2s)';
let last = 0;

export async function politeFetch(url, { minGapMs = 2000 } = {}) {
  const wait = last + minGapMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

// Large binary downloads go through curl (resumable, progress-free).
export function download(url, dest) {
  execFileSync('curl', ['-sS', '-f', '-L', '-A', USER_AGENT, '-o', dest, url], { stdio: 'inherit' });
}
