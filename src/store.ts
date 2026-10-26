import { create } from 'zustand';
import { SCHEMES } from './data/schemes';
import { importGeoJSON, polyLength, snapToRoads, type V2, type Village } from './lib/geo';
import { defaultRoadParams, formatShort, type RoadEstimate, type RoadParams } from './lib/cost';
import { checkDuplicate, estimateRoad } from './lib/api';
import { msg, tr, type Lang } from './i18n';
import sampleRaw from './data/sample-village.geojson?raw';

export type Tool = 'orbit' | 'road' | 'measure';

export interface RoadWork {
  id: string;
  type: 'road';
  pts: V2[];
  params: RoadParams;
  length: number;
  cost: number;
  estimate: RoadEstimate;
  schemeId: string;
  subject: number;
}
export type Activity = RoadWork;
type Spent = Record<string, number>;
interface Snapshot { activities: Activity[]; spent: Spent }

const uid = () => Math.random().toString(36).slice(2, 9);
const emptySpent = (): Spent => Object.fromEntries(SCHEMES.map((s) => [s.id, 0]));

export const sampleVillage: Village = importGeoJSON(JSON.parse(sampleRaw), { id: 'sample', name: 'Rampura (sample)' });

const planKey = (vid: string) => `gy-plan-${vid}`;
export interface SavedPlan { activities: Activity[]; spent: Spent; at: number }
export const loadPlan = (vid: string): SavedPlan | null => {
  try {
    const raw = localStorage.getItem(planKey(vid));
    return raw ? (JSON.parse(raw) as SavedPlan) : null;
  } catch {
    return null;
  }
};
const savePlan = (vid: string, activities: Activity[], spent: Spent) => {
  try {
    localStorage.setItem(planKey(vid), JSON.stringify({ activities, spent, at: Date.now() }));
  } catch {
    /* storage full or blocked: the game still works */
  }
};

interface State {
  screen: 'home' | 'game';
  lang: Lang;
  villages: Village[];
  village: Village;
  activities: Activity[];
  spent: Spent;
  past: Snapshot[];
  future: Snapshot[];
  tool: Tool;
  draft: V2[];
  measure: V2[];
  roadParams: RoadParams;
  schemeId: string;
  busy: boolean;
  toast: { msg: string; id: number } | null;
  celebrate: number;
  orthoUrl: string | null;

  setLang: (l: Lang) => void;
  say: (m: string) => void;
  openVillage: (v: Village, resume: boolean) => void;
  goHome: () => void;
  addVillageFromFile: (text: string, name: string) => Village | null;
  setTool: (t: Tool) => void;
  setRoadParams: (p: Partial<RoadParams>) => void;
  setScheme: (id: string) => void;
  setOrtho: (url: string | null) => void;
  tap: (p: V2) => void;
  popPoint: () => void;
  clearDraft: () => void;
  commitRoad: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

export const useStore = create<State>((set, get) => ({
  screen: 'home',
  lang: 'en',
  villages: [sampleVillage],
  village: sampleVillage,
  activities: [],
  spent: emptySpent(),
  past: [],
  future: [],
  tool: 'orbit',
  draft: [],
  measure: [],
  roadParams: defaultRoadParams('CC'),
  schemeId: 'fc15',
  busy: false,
  toast: null,
  celebrate: 0,
  orthoUrl: null,

  setLang: (lang) => set({ lang }),
  say: (m) => set({ toast: { msg: m, id: Date.now() } }),

  openVillage: (v, resume) => {
    const saved = resume ? loadPlan(v.id) : null;
    set({
      screen: 'game', village: v, tool: 'orbit', draft: [], measure: [], past: [], future: [], orthoUrl: null,
      activities: saved?.activities ?? [], spent: saved?.spent ?? emptySpent(),
    });
  },
  goHome: () => set({ screen: 'home', tool: 'orbit', draft: [], measure: [] }),

  addVillageFromFile: (text, name) => {
    try {
      const v = importGeoJSON(JSON.parse(text), { name: name.replace(/\.(geo)?json$/i, '') });
      set((s) => ({ villages: [...s.villages, v] }));
      return v;
    } catch (e) {
      get().say(msg.badFile(get().lang, e instanceof Error ? e.message : 'unknown error'));
      return null;
    }
  },

  setTool: (tool) => set({ tool, draft: [], measure: [] }),
  setRoadParams: (p) =>
    set((s) => {
      const next = { ...s.roadParams, ...p };
      if (p.type && p.type !== s.roadParams.type) {
        const d = defaultRoadParams(p.type); // new surface -> sensible thickness and width, shoulder kept
        next.thickness = d.thickness;
        next.width = Math.min(next.width, p.type === 'Gravel' ? 3.5 : 7.5);
      }
      return { roadParams: next };
    }),
  setScheme: (id) => {
    const sch = SCHEMES.find((x) => x.id === id);
    if (get().tool === 'road' && sch && !sch.eligible.includes('road')) {
      get().say(msg.wrongScheme(get().lang));
      return;
    }
    set({ schemeId: id });
  },
  setOrtho: (orthoUrl) => set({ orthoUrl }),

  tap: (p) => {
    const s = get();
    if (s.tool === 'road') {
      const all = [...s.village.roads, ...s.activities];
      set({ draft: [...s.draft, snapToRoads(p, all)] });
    } else if (s.tool === 'measure') {
      set({ measure: s.measure.length >= 2 ? [p] : [...s.measure, p] });
    }
  },
  popPoint: () => set((s) => ({ draft: s.draft.slice(0, -1) })),
  clearDraft: () => set({ draft: [], measure: [] }),

  commitRoad: async () => {
    const s = get();
    if (s.busy) return;
    if (s.draft.length < 2) return s.say(tr(s.lang, 'needTwo'));
    const length = polyLength(s.draft);
    if (length < 5) return s.say(tr(s.lang, 'tooShort'));

    set({ busy: true });
    try {
      const others = [...s.village.roads, ...s.activities].map((r) => ({
        id: r.id, pts: r.pts, width: 'params' in r ? r.params.width : r.width,
      }));
      const dup = await checkDuplicate(s.draft, s.roadParams.width, others);
      if (dup.duplicate) return get().say(msg.dup(s.lang));

      const { estimate } = await estimateRoad(s.roadParams, s.draft, length);
      const scheme = SCHEMES.find((x) => x.id === s.schemeId) ?? SCHEMES[0];
      const left = scheme.total - (get().spent[scheme.id] ?? 0);
      if (estimate.total > left)
        return get().say(msg.funds(s.lang, scheme.short, formatShort(left), formatShort(estimate.total)));

      const cur = get();
      const work: RoadWork = {
        id: uid(), type: 'road', pts: cur.draft, params: cur.roadParams, length,
        cost: estimate.total, estimate, schemeId: scheme.id, subject: 13,
      };
      const activities = [...cur.activities, work];
      const spent = { ...cur.spent, [scheme.id]: (cur.spent[scheme.id] ?? 0) + estimate.total };
      set({
        past: [...cur.past, { activities: cur.activities, spent: cur.spent }],
        future: [], activities, spent, draft: [], celebrate: cur.celebrate + 1,
      });
      savePlan(cur.village.id, activities, spent);
      get().say(msg.done(s.lang, formatShort(estimate.total)));
    } finally {
      set({ busy: false });
    }
  },

  undo: () => {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return;
    set({
      past: s.past.slice(0, -1),
      future: [{ activities: s.activities, spent: s.spent }, ...s.future],
      activities: prev.activities, spent: prev.spent,
    });
    savePlan(s.village.id, prev.activities, prev.spent);
    get().say(msg.undone(s.lang));
  },
  redo: () => {
    const s = get();
    const next = s.future[0];
    if (!next) return;
    set({
      future: s.future.slice(1),
      past: [...s.past, { activities: s.activities, spent: s.spent }],
      activities: next.activities, spent: next.spent,
    });
    savePlan(s.village.id, next.activities, next.spent);
    get().say(msg.redone(s.lang));
  },
}));
