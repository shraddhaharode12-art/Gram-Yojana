import { useMemo } from 'react';
import { tr, type Key } from './i18n';
import { useStore } from './store';
import { polyLength } from './lib/geo';
import { roadEstimate } from './lib/cost';

export function useT() {
  const lang = useStore((s) => s.lang);
  return (k: Key) => tr(lang, k);
}

/** Live length + cost of the road being drawn, recomputed on every tap or slider change. */
export function useLiveRoad() {
  const draft = useStore((s) => s.draft);
  const params = useStore((s) => s.roadParams);
  return useMemo(() => {
    const length = polyLength(draft);
    return { length, estimate: draft.length >= 2 ? roadEstimate(params, length) : null };
  }, [draft, params]);
}
