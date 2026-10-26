// Calls the FastAPI service when VITE_API_URL is set and reachable; otherwise falls back to the
// same maths in the browser, so the game never breaks on a bad network.
import { duplicateCheck, type V2 } from './geo';
import { roadEstimate, type RoadEstimate, type RoadParams } from './cost';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

async function post<T>(path: string, body: unknown, ms = 2500): Promise<T | null> {
  if (!BASE) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type Source = 'server' | 'local';

export async function estimateRoad(
  params: RoadParams,
  pts: V2[],
  length: number,
): Promise<{ estimate: RoadEstimate; source: Source }> {
  const r = await post<RoadEstimate>('/estimate/road', { ...params, points: pts, length });
  if (r && typeof r.total === 'number' && Array.isArray(r.items)) return { estimate: r, source: 'server' };
  return { estimate: roadEstimate(params, length), source: 'local' };
}

export interface DupResult { duplicate: boolean; overlap: number; withId?: string | null }

export async function checkDuplicate(
  candidate: V2[],
  width: number,
  others: { id: string; pts: V2[]; width: number }[],
): Promise<DupResult & { source: Source }> {
  const r = await post<DupResult>('/roads/duplicate-check', { candidate, width, others });
  if (r && typeof r.duplicate === 'boolean') return { ...r, source: 'server' };
  return { ...duplicateCheck(candidate, width, others), source: 'local' };
}
