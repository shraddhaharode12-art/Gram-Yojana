import { useState } from 'react';
import { SCHEMES } from '../data/schemes';
import { ROAD_SPECS, formatINR } from '../lib/cost';
import type { RoadType } from '../lib/geo';
import { useLiveRoad, useT } from '../hooks';
import { useStore } from '../store';
import { Divider, IconTrash } from './ui';

const TYPES: RoadType[] = ['CC', 'BT', 'WBM', 'Gravel'];

function Slider(p: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-[13px] font-bold">
        <span>{p.label}</span>
        <span className="hand text-base">{p.value}{p.unit}</span>
      </div>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export default function RoadSheet() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const params = useStore((s) => s.roadParams);
  const set = useStore((s) => s.setRoadParams);
  const draft = useStore((s) => s.draft);
  const popPoint = useStore((s) => s.popPoint);
  const clear = useStore((s) => s.clearDraft);
  const commit = useStore((s) => s.commitRoad);
  const busy = useStore((s) => s.busy);
  const schemeId = useStore((s) => s.schemeId);
  const live = useLiveRoad();
  const [open, setOpen] = useState(true);
  const spec = ROAD_SPECS[params.type];
  const scheme = SCHEMES.find((s) => s.id === schemeId);

  return (
    <div className="rise sketch bg-chalk mx-2 mb-2 max-h-[58dvh] overflow-y-auto px-3 pb-3 pt-2">
      <button className="flex w-full items-center justify-between py-1 text-left" onClick={() => setOpen(!open)}>
        <span className="hand text-lg">
          {draft.length === 0 ? t('tapStart') : draft.length === 1 ? t('tapMore') : `${t('length')}: ${live.length.toFixed(1)} m`}
        </span>
        <span className="text-xl">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <>
          <Divider className="text-soil/60" />
          <div className="mt-2 text-[13px] font-bold">{t('roadType')}</div>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {TYPES.map((k) => (
              <button
                key={k} onClick={() => set({ type: k })}
                className={`sketch-sm pressable min-h-[48px] px-1 text-[13px] font-bold leading-tight ${params.type === k ? 'bg-neem text-chalk' : 'bg-chalk-dark'}`}
              >
                {k}
                <span className="block text-[10px] font-normal opacity-80">
                  {(lang === 'hi' ? ROAD_SPECS[k].hi : ROAD_SPECS[k].label).replace(/^.*?\(|\)$/g, '')}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-0.5">
            <Slider label={t('width')} value={params.width} min={params.type === 'Gravel' ? 2.5 : 3} max={7.5} step={0.25} unit=" m" onChange={(v) => set({ width: v })} />
            <Slider label={t('thickness')} value={params.thickness} min={spec.min} max={spec.max} step={spec.step} unit=" mm" onChange={(v) => set({ thickness: v })} />
            <Slider label={t('shoulder')} value={params.shoulder} min={0} max={1.5} step={0.25} unit=" m" onChange={(v) => set({ shoulder: v })} />
          </div>

          {live.estimate && (
            <div className="sketch-sm mt-2 bg-haldi-light/60 px-3 py-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold">{t('cost')}</span>
                <span className="hand text-3xl leading-none">{formatINR(live.estimate.total)}</span>
              </div>
              <div className="mt-1 space-y-0.5 text-[12px]">
                {live.estimate.items.map((i) => (
                  <div key={i.label} className="flex justify-between"><span>{i.label}</span><span>{formatINR(i.amount)}</span></div>
                ))}
                <div className="flex justify-between opacity-70">
                  <span>{t('fundedBy')}</span><span>{lang === 'hi' ? scheme?.hi : scheme?.en}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button onClick={popPoint} disabled={!draft.length} className="sketch pressable min-h-[52px] bg-chalk-dark px-3 text-[14px] font-bold">↶ {t('lastPoint')}</button>
            <button onClick={clear} disabled={!draft.length} aria-label={t('clear')} className="sketch pressable grid min-h-[52px] w-[52px] place-items-center bg-chalk-dark"><IconTrash /></button>
            <button
              onClick={commit} disabled={draft.length < 2 || busy}
              className="sketch pressable min-h-[52px] flex-1 bg-terracotta px-3 text-[16px] font-bold text-chalk"
            >
              {busy ? '…' : t('build')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
