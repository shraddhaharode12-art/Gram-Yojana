import { useRef } from 'react';
import { useT } from '../hooks';
import { useStore } from '../store';
import { formatShort } from '../lib/cost';
import { SCHEMES } from '../data/schemes';
import BudgetBar from './BudgetBar';
import RoadSheet from './RoadSheet';
import Toolbar from './Toolbar';
import Village3D from './Village3D';
import { Celebrate, Empty, IconHome, IconPhoto, IconRedo, IconUndo, Toast } from './ui';

export default function Game() {
  const t = useT();
  const village = useStore((s) => s.village);
  const goHome = useStore((s) => s.goHome);
  const tool = useStore((s) => s.tool);
  const activities = useStore((s) => s.activities);
  const spent = useStore((s) => s.spent);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const setOrtho = useStore((s) => s.setOrtho);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalSpent = SCHEMES.reduce((a, s) => a + (spent[s.id] ?? 0), 0);

  return (
    <div className="paper relative h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-0"><Village3D /></div>

      {/* top: title + envelope */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-chalk via-chalk/90 to-transparent pb-1 pt-[max(env(safe-area-inset-top),8px)]">
        <div className="flex items-center gap-2 px-3 pb-1">
          <button onClick={goHome} aria-label={t('back')} className="sketch pressable grid h-11 w-11 place-items-center bg-chalk"><IconHome /></button>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="hand truncate text-xl">{village.name}</div>
            <div className="text-[12px] opacity-70">{activities.length} works · {formatShort(totalSpent)}</div>
          </div>
          <button onClick={() => fileRef.current?.click()} aria-label={t('walls')} className="sketch pressable grid h-11 w-11 place-items-center bg-chalk"><IconPhoto /></button>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="sketch pressable h-11 min-w-11 bg-haldi-light px-2 text-[14px] font-bold">{lang === 'en' ? 'हि' : 'EN'}</button>
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setOrtho(URL.createObjectURL(f)); e.target.value = ''; }}
          />
        </div>
        <BudgetBar />
      </div>

      {/* undo / redo */}
      <div className="absolute right-3 top-[168px] z-10 flex flex-col gap-2">
        <button onClick={undo} disabled={!canUndo} aria-label={t('undo')} className="sketch pressable grid h-12 w-12 place-items-center bg-chalk"><IconUndo /></button>
        <button onClick={redo} disabled={!canRedo} aria-label={t('redo')} className="sketch pressable grid h-12 w-12 place-items-center bg-chalk"><IconRedo /></button>
      </div>

      {/* bottom: sheet + toolbox */}
      <div className="absolute inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
        {tool === 'orbit' && activities.length === 0 && (
          <div className="sketch mx-2 mb-2 bg-chalk/95"><Empty>{t('emptyWorks')}</Empty></div>
        )}
        {tool === 'measure' && (
          <div className="sketch rise mx-2 mb-2 bg-chalk px-3 py-3 text-center hand text-lg">{t('measureHint')}</div>
        )}
        {tool === 'road' && <RoadSheet />}
        <Toolbar />
      </div>

      <Toast />
      <Celebrate />
    </div>
  );
}
