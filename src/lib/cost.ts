// Indicative rate card (used when the Python service is offline, and mirrored in backend/main.py).
// Rates are illustrative for the demo; a Panchayat must use its own District Schedule of Rates (DSR).
import type { RoadType } from './geo';

export interface RoadParams {
  type: RoadType;
  width: number; // carriageway, metres
  thickness: number; // crust thickness, mm
  shoulder: number; // each side, metres
}

export interface RoadSpec {
  label: string;
  hi: string;
  rate: number; // Rs per sq.m at reference thickness
  ref: number; // reference thickness, mm
  min: number;
  max: number;
  step: number;
  color: string;
}

export const ROAD_SPECS: Record<RoadType, RoadSpec> = {
  BT: { label: 'BT (black-top)', hi: 'बीटी (डामर)', rate: 1050, ref: 50, min: 40, max: 75, step: 5, color: '#3A3633' },
  CC: { label: 'CC (cement)', hi: 'सीसी (सीमेंट)', rate: 1650, ref: 150, min: 100, max: 200, step: 10, color: '#B9B3A6' },
  WBM: { label: 'WBM (stone)', hi: 'डब्ल्यूबीएम (पत्थर)', rate: 720, ref: 150, min: 100, max: 200, step: 10, color: '#8A7B66' },
  Gravel: { label: 'Gravel (murum)', hi: 'मुरम (कच्ची)', rate: 340, ref: 100, min: 75, max: 150, step: 5, color: '#B79A6B' },
};

export const SHOULDER_RATE = 220; // Rs per sq.m, compacted moorum
export const CONTINGENCY = 0.05; // supervision + quality control

export const defaultRoadParams = (type: RoadType = 'CC'): RoadParams => ({
  type,
  width: type === 'Gravel' ? 3 : 3.75,
  thickness: ROAD_SPECS[type].ref,
  shoulder: 0.5,
});

export interface CostItem { label: string; amount: number }
export interface RoadEstimate { area: number; items: CostItem[]; total: number }

export function roadEstimate(p: RoadParams, length: number): RoadEstimate {
  const s = ROAD_SPECS[p.type];
  // 35% of the rate is fixed work (formation, rolling); 65% scales with crust thickness
  const factor = 0.35 + 0.65 * (p.thickness / s.ref);
  const carriage = Math.round(s.rate * factor * p.width * length);
  const shoulders = Math.round(SHOULDER_RATE * p.shoulder * 2 * length);
  const sub = carriage + shoulders;
  const cont = Math.round(sub * CONTINGENCY);
  return {
    area: p.width * length,
    items: [
      { label: `${p.type} carriageway`, amount: carriage },
      { label: 'Shoulders (moorum)', amount: shoulders },
      { label: 'Supervision & quality (5%)', amount: cont },
    ],
    total: sub + cont,
  };
}

const inr = new Intl.NumberFormat('en-IN');
export const formatINR = (n: number) => `₹${inr.format(Math.round(n))}`;
export const formatShort = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : formatINR(n);
