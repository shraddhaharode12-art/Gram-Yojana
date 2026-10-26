import { SCHEMES } from '../data/schemes';
import { formatShort } from '../lib/cost';
import { useLiveRoad, useT } from '../hooks';
import { useStore } from '../store';

/** The resource envelope: one card per scheme, remaining balance dropping live as the road is drawn. */
export default function BudgetBar() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const spent = useStore((s) => s.spent);
  const schemeId = useStore((s) => s.schemeId);
  const setScheme = useStore((s) => s.setScheme);
  const tool = useStore((s) => s.tool);
  const live = useLiveRoad();
  const preview = tool === 'road' && live.estimate ? live.estimate.total : 0;

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2 pt-1">
      {SCHEMES.map((s) => {
        const used = spent[s.id] ?? 0;
        const left = s.total - used;
        const active = s.id === schemeId;
        const drop = active ? preview : 0;
        const after = left - drop;
        const short = after < 0;
        const usedPct = (used / s.total) * 100;
        const dropPct = Math.min(100 - usedPct, (drop / s.total) * 100);
        const eligible = s.eligible.includes('road') || tool !== 'road';
        return (
          <button
            key={s.id} onClick={() => setScheme(s.id)}
            className={`sketch pressable shrink-0 min-w-[148px] px-3 py-2 text-left ${active ? 'bg-haldi-light' : 'bg-chalk'} ${eligible ? '' : 'opacity-50'}`}
          >
            <div className="text-[12px] font-bold leading-tight">{lang === 'hi' ? s.hi : s.short}</div>
            <div className={`hand text-[22px] leading-none mt-0.5 ${short ? 'text-terracotta-dark' : ''}`}>
              {formatShort(Math.max(after, 0))}
            </div>
            <div className="text-[11px] opacity-70">{t('left')}{drop > 0 && ` · −${formatShort(drop)}`}</div>
            <div className="sketch-sm mt-1 flex h-2.5 overflow-hidden bg-chalk-dark">
              <div className="bg-neem" style={{ width: `${usedPct}%` }} />
              <div className="bg-terracotta" style={{ width: `${dropPct}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
