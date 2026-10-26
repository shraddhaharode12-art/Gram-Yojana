import type { ReactNode } from 'react';
import type { Key } from '../i18n';
import { useT } from '../hooks';
import { useStore, type Tool } from '../store';
import { IconDrain, IconDrop, IconLamp, IconRoad, IconRuler, IconToilet } from './ui';

interface ToolDef { id: Tool | 'drain' | 'water' | 'toilet' | 'light'; key: Key; icon: ReactNode; live: boolean }
const TOOLS: ToolDef[] = [
  { id: 'road', key: 'road', icon: <IconRoad />, live: true },
  { id: 'measure', key: 'measure', icon: <IconRuler />, live: true },
  { id: 'light', key: 'light', icon: <IconLamp />, live: false },
  { id: 'drain', key: 'drain', icon: <IconDrain />, live: false },
  { id: 'water', key: 'water', icon: <IconDrop />, live: false },
  { id: 'toilet', key: 'toilet', icon: <IconToilet />, live: false },
];

export default function Toolbar() {
  const t = useT();
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const say = useStore((s) => s.say);

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3 pt-1">
      {TOOLS.map((d) => {
        const active = d.id === tool;
        return (
          <button
            key={d.id}
            onClick={() => {
              if (!d.live) return say(`${t(d.key)}: ${t('soon')}`);
              setTool(active ? 'orbit' : (d.id as Tool));
            }}
            className={`sketch pressable flex min-h-[60px] min-w-[68px] shrink-0 flex-col items-center justify-center px-2 text-[12px] font-bold ${active ? 'bg-terracotta text-chalk' : 'bg-chalk'} ${d.live ? '' : 'opacity-55'}`}
          >
            {d.icon}
            {t(d.key)}
          </button>
        );
      })}
    </div>
  );
}
