import { useMemo, useRef, useState } from 'react';
import { useT } from '../hooks';
import { loadPlan, useStore } from '../store';
import { formatShort } from '../lib/cost';
import { Divider, Empty, Warli } from './ui';
import { Toast } from './ui';

export default function Home() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const villages = useStore((s) => s.villages);
  const open = useStore((s) => s.openVillage);
  const addFromFile = useStore((s) => s.addVillageFromFile);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(
    () => villages.filter((v) => `${v.name} ${v.gp} ${v.district}`.toLowerCase().includes(q.trim().toLowerCase())),
    [villages, q],
  );
  const withPlan = villages
    .map((v) => ({ v, plan: loadPlan(v.id) }))
    .filter((x) => x.plan && x.plan.activities.length > 0);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const v = addFromFile(await f.text(), f.name);
    if (v) open(v, false);
  };

  return (
    <div className="paper min-h-[100dvh] pb-10">
      <header className="relative bg-terracotta px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] text-chalk">
        <button
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          className="sketch pressable absolute right-4 top-[max(env(safe-area-inset-top),16px)] h-11 min-w-11 bg-haldi-light px-2 text-[14px] font-bold text-soil"
        >
          {lang === 'en' ? 'हि' : 'EN'}
        </button>
        <Warli className="text-chalk" size={190} />
        <h1 className="hand mt-1 text-4xl leading-none">{t('appName')}</h1>
        <p className="mt-1 max-w-xs text-[15px] opacity-95">{t('tagline')}</p>
      </header>
      <div className="-mt-1 text-terracotta"><Divider /></div>

      <main className="mx-auto max-w-md px-4">
        <section className="mt-4">
          <h2 className="hand text-xl">{t('continuePlan')}</h2>
          {withPlan.length === 0 ? (
            <div className="sketch mt-2 bg-chalk"><Empty>{t('noPlanYet')}</Empty></div>
          ) : (
            withPlan.map(({ v, plan }) => (
              <button
                key={v.id} onClick={() => open(v, true)}
                className="sketch pressable mt-2 flex w-full items-center justify-between bg-haldi-light px-4 py-3 text-left"
              >
                <span>
                  <span className="hand block text-lg">{v.name}</span>
                  <span className="text-[13px]">
                    {plan!.activities.length} works · {formatShort(plan!.activities.reduce((a, w) => a + w.cost, 0))}
                  </span>
                </span>
                <span className="text-2xl">→</span>
              </button>
            ))
          )}
        </section>

        <section className="mt-6">
          <h2 className="hand text-xl">{t('pickVillage')}</h2>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')}
            className="sketch-sm mt-2 min-h-[48px] w-full bg-chalk px-3 text-[16px] outline-none focus:bg-haldi-light/40"
          />
          <div className="mt-3 space-y-3">
            {shown.map((v) => (
              <button
                key={v.id} onClick={() => open(v, false)}
                className="sketch pressable block w-full bg-chalk px-4 py-3 text-left"
              >
                <span className="hand block text-xl">{v.name}</span>
                <span className="text-[13px] opacity-75">
                  {v.gp} · {v.district}, {v.state} · {v.buildings.length} houses · {v.roads.length} roads
                </span>
                <span className="mt-2 inline-block rounded bg-neem px-3 py-1 text-[13px] font-bold text-chalk">{t('open')}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="sketch pressable w-full bg-chalk-dark px-4 py-4 text-left"
            style={{ borderStyle: 'dashed' }}
          >
            <span className="hand block text-lg">{t('upload')}</span>
            <span className="text-[13px] opacity-75">{t('uploadHint')}</span>
          </button>
          <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </section>
      </main>
      <Toast />
    </div>
  );
}
