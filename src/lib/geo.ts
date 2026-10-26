// Geometry helpers + GeoJSON importer. Everything inside the app lives in local metres
// (x = east, y = north) around the village centre, so distances are real and cheap to compute.

export type V2 = [number, number];
export type RoadType = 'BT' | 'CC' | 'WBM' | 'Gravel';
export type RoofType = 'RCC' | 'Tiled' | 'Tin' | 'Thatch';

export interface Building {
  id: string;
  ring: V2[]; // closed ring is NOT repeated (last != first)
  height: number;
  roof: RoofType;
  floors: number;
  hamlet?: string;
}
export interface Road {
  id: string;
  pts: V2[];
  type: RoadType;
  width: number;
  existing: boolean;
}
export interface Village {
  id: string;
  name: string;
  gp: string;
  district: string;
  state: string;
  origin: [number, number]; // lon, lat of local (0,0); [0,0] if source was already in metres
  buildings: Building[];
  roads: Road[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

const M_LAT = 111_320;

export const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const polyLength = (p: V2[]) => {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]);
  return s;
};

export function closestOnSegment(p: V2, a: V2, b: V2): { pt: V2; d: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const pt: V2 = [a[0] + dx * t, a[1] + dy * t];
  return { pt, d: dist(p, pt) };
}

export function closestOnPolyline(p: V2, pts: V2[]): { pt: V2; d: number } {
  let best = { pt: pts[0], d: Infinity };
  for (let i = 1; i < pts.length; i++) {
    const c = closestOnSegment(p, pts[i - 1], pts[i]);
    if (c.d < best.d) best = c;
  }
  return best;
}

export function samplePolyline(pts: V2[], step: number): V2[] {
  const out: V2[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = dist(a, b);
    let d = step - carry;
    while (d <= len) {
      const f = d / len;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      d += step;
    }
    carry = len - (d - step);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Snap a tapped point to an existing/planned road centre-line if it is close (makes junctions easy). */
export function snapToRoads(p: V2, roads: { pts: V2[] }[], within = 3): V2 {
  let best: { pt: V2; d: number } | null = null;
  for (const r of roads) {
    const c = closestOnPolyline(p, r.pts);
    if (!best || c.d < best.d) best = c;
  }
  return best && best.d <= within ? best.pt : p;
}

/** Local duplicate check, same idea as the Python service: how much of the new line runs along another road? */
export function duplicateCheck(
  candidate: V2[],
  width: number,
  others: { id: string; pts: V2[]; width: number }[],
): { duplicate: boolean; overlap: number; withId?: string } {
  const samples = samplePolyline(candidate, 2);
  let worst = { overlap: 0, id: undefined as string | undefined };
  for (const o of others) {
    const tol = Math.max(width, o.width) / 2 + 1.0;
    let hit = 0;
    for (const s of samples) if (closestOnPolyline(s, o.pts).d <= tol) hit++;
    const ratio = hit / samples.length;
    if (ratio > worst.overlap) worst = { overlap: ratio, id: o.id };
  }
  return { duplicate: worst.overlap >= 0.4, overlap: worst.overlap, withId: worst.id };
}

// ---------------------------------------------------------------- GeoJSON importer

type Props = Record<string, unknown>;
const pick = (p: Props, keys: string[]) => {
  for (const k of keys) if (p[k] !== undefined && p[k] !== null && p[k] !== '') return p[k];
  return undefined;
};
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) ? n : undefined;
};

function roadType(p: Props): RoadType {
  const s = String(pick(p, ['road_type', 'roadType', 'surface', 'highway', 'type', 'ROAD_TYPE']) ?? '').toLowerCase();
  if (s === 'cc' || s.includes('concrete') || s.includes('cement')) return 'CC';
  if (s === 'bt' || s.includes('asphalt') || s.includes('bitumen') || s.includes('paved') || s.includes('tar')) return 'BT';
  if (s.includes('wbm') || s.includes('water bound')) return 'WBM';
  return 'Gravel';
}
function roofType(p: Props): RoofType {
  const s = String(pick(p, ['roof_type', 'roof', 'ROOF_TYPE', 'Roof_Type', 'roof_material']) ?? '').toLowerCase();
  if (s.includes('til')) return 'Tiled';
  if (s.includes('tin') || s.includes('sheet') || s.includes('asbestos') || s.includes('metal')) return 'Tin';
  if (s.includes('thatch') || s.includes('grass')) return 'Thatch';
  return 'RCC';
}

interface GFeature {
  type: string;
  properties?: Props | null;
  geometry?: { type: string; coordinates: unknown } | null;
}

export function importGeoJSON(raw: unknown, opts: { id?: string; name?: string } = {}): Village {
  const fc = raw as { type?: string; features?: GFeature[]; properties?: Props };
  const feats: GFeature[] =
    fc?.type === 'FeatureCollection' && Array.isArray(fc.features)
      ? fc.features
      : fc?.type === 'Feature'
        ? [fc as unknown as GFeature]
        : [];
  if (!feats.length) throw new Error('This file has no features. Please upload a GeoJSON FeatureCollection.');

  // 1. collect raw coordinates to find the centre and decide lon/lat vs metres
  const lines: { coords: number[][]; props: Props; poly: boolean }[] = [];
  const addLine = (coords: unknown, props: Props, poly: boolean) => {
    if (Array.isArray(coords) && coords.length >= 2) lines.push({ coords: coords as number[][], props, poly });
  };
  for (const f of feats) {
    const g = f.geometry;
    const props = (f.properties ?? {}) as Props;
    if (!g) continue;
    const c = g.coordinates as unknown[];
    if (g.type === 'LineString') addLine(c, props, false);
    else if (g.type === 'MultiLineString') (c as unknown[]).forEach((l) => addLine(l, props, false));
    else if (g.type === 'Polygon') addLine((c as unknown[])[0], props, true);
    else if (g.type === 'MultiPolygon') (c as unknown[]).forEach((p) => addLine((p as unknown[])[0], props, true));
  }
  if (!lines.length) throw new Error('Could not find any roads or building footprints in this file.');

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const l of lines)
    for (const [x, y] of l.coords) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const isLonLat = Math.abs(maxX) <= 180 && Math.abs(maxY) <= 90;
  const mLon = M_LAT * Math.cos((cy * Math.PI) / 180);
  const proj = ([x, y]: number[]): V2 => (isLonLat ? [(x - cx) * mLon, (y - cy) * M_LAT] : [x - cx, y - cy]);

  // 2. convert
  const buildings: Building[] = [];
  const roads: Road[] = [];
  let n = 0;
  for (const l of lines) {
    const pts = l.coords.map(proj);
    if (l.poly) {
      const ring = pts.slice();
      if (ring.length > 1 && dist(ring[0], ring[ring.length - 1]) < 1e-6) ring.pop();
      if (ring.length < 3) continue;
      const floors = Math.max(1, Math.round(num(pick(l.props, ['floors', 'FLOORS', 'no_floors', 'NO_FLOORS'])) ?? 1));
      const height = num(pick(l.props, ['height_m', 'height', 'HEIGHT', 'Height'])) ?? 3.2 * floors;
      buildings.push({
        id: `b${n++}`, ring, height, floors, roof: roofType(l.props),
        hamlet: pick(l.props, ['hamlet', 'tola', 'habitation']) as string | undefined,
      });
    } else {
      roads.push({
        id: `r${n++}`, pts, type: roadType(l.props),
        width: num(pick(l.props, ['width_m', 'width', 'WIDTH'])) ?? 3.5, existing: true,
      });
    }
  }

  const half = (a: number, b: number) => (b - a) / 2;
  const w = isLonLat ? half(minX, maxX) * mLon : half(minX, maxX);
  const h = isLonLat ? half(minY, maxY) * M_LAT : half(minY, maxY);
  const meta = (fc.properties ?? {}) as Props;
  return {
    id: opts.id ?? `upload-${Date.now().toString(36)}`,
    name: opts.name ?? (meta.name as string) ?? 'Uploaded village',
    gp: (meta.gram_panchayat as string) ?? '—',
    district: (meta.district as string) ?? '—',
    state: (meta.state as string) ?? '—',
    origin: isLonLat ? [cx, cy] : [0, 0],
    buildings, roads,
    bounds: { minX: -w, maxX: w, minY: -h, maxY: h },
  };
}
