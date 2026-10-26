import { useEffect, useMemo, type ReactNode } from 'react';
import { useStore } from '../store';

/* ---------- sketchy icons: round caps, not-quite-straight lines ---------- */
const base = {
  width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};
export const IconRoad = () => (
  <svg {...base}><path d="M9 3 L4 25" /><path d="M19 3 L24 25.4" /><path d="M14 4 L14.2 8 M14 12 L14.1 16 M14.2 20 L14 24" strokeDasharray="1 0" /></svg>
);
export const IconRuler = () => (
  <svg {...base}><path d="M3.5 19.5 L19.5 3.4 L24.6 8.6 L8.6 24.5 Z" /><path d="M8 15.5 L10.6 18 M11.7 11.6 L14.2 14.3 M15.5 7.9 L18 10.5" /></svg>
);
export const IconLamp = () => (
  <svg {...base}><path d="M14 25 L14.3 11" /><path d="M14.3 11 C14 6 8 5 5 8" /><circle cx="5" cy="9.5" r="2.4" /><path d="M10 25 H18" /></svg>
);
export const IconDrop = () => (
  <svg {...base}><path d="M14 3.5 C14 3.5 6.5 12 6.5 17 A7.5 7.3 0 0 0 21.5 17 C21.5 12 14 3.5 14 3.5 Z" /></svg>
);
export const IconToilet = () => (
  <svg {...base}><path d="M7 4 H19 V12" /><path d="M4.5 12.5 H23.5 C23.5 18 20 21 14 21 C8 21 4.5 18 4.5 12.5Z" /><path d="M10 21 L9 25 H19 L18 21" /></svg>
);
export const IconDrain = () => (
  <svg {...base}><path d="M3 8 C8 5 11 11 15 8 C19 5 22 10 25 8" /><path d="M3 15 C8 12 11 18 15 15 C19 12 22 17 25 15" /><path d="M3 22 C8 19 11 25 15 22 C19 19 22 24 25 22" /></svg>
);
export const IconUndo = () => (
  <svg {...base}><path d="M9 6 L4.5 11 L9.4 15.5" /><path d="M5 11 H16 A6 6 0 0 1 16 23 H9" /></svg>
);
export const IconRedo = () => (
  <svg {...base}><path d="M19 6 L23.5 11 L18.6 15.5" /><path d="M23 11 H12 A6 6 0 0 0 12 23 H19" /></svg>
);
export const IconTrash = () => (
  <svg {...base}><path d="M5 7 H23" /><path d="M11 7 V4 H17 V7" /><path d="M7 7 L8.4 24 H19.6 L21 7" /></svg>
);
export const IconPhoto = () => (
  <svg {...base}><path d="M3.5 6.5 H24.5 V22 H3.5 Z" /><circle cx="10" cy="12" r="2" /><path d="M4 21 L11 15 L16 19 L20 15 L24 19" /></svg>
);
export const IconHome = () => (
  <svg {...base}><path d="M3 14 L14 4 L25 14" /><path d="M6 12.5 V24 H22 V12.5" /><path d="M12 24 V17 H16 V24" /></svg>
);

/* ---------- Warli-inspired figures: triangles for bodies, circles for heads ---------- */
function Person({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="-17" r="3.3" />
      <path d="M-5.5 -12 L5.5 -12 L0 -2 Z" />
      <path d="M-5 8 L5 8 L0 -2 Z" />
      <path d={`M${-5 * s} -11 L${-12 * s} -5 M${5 * s} -11 L${12 * s} -16`} fill="none" />
    </g>
  );
}
export function Warli({ className = '', size = 160 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 160 70" width={size} height={(size * 70) / 160} className={className}
      fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="132" cy="14" r="7" fill="none" />
      <path d="M132 2 V-2 M144 14 H149 M120 14 H115 M141 5 L145 1 M123 5 L119 1" fill="none" />
      <path d="M8 66 H152" fill="none" strokeDasharray="3 4" />
      <g className="bob"><Person x={30} y={46} /></g>
      <g className="bob" style={{ animationDelay: '0.2s' }}><Person x={58} y={46} flip /></g>
      <g className="bob" style={{ animationDelay: '0.4s' }}><Person x={86} y={46} /></g>
      <path d="M38 36 L50 36 M66 36 L78 36" fill="none" />
      <path d="M110 66 L124 40 L138 66 Z" fill="none" />
      <path d="M121 66 V56 H127 V66" fill="none" />
    </svg>
  );
}

/** A slightly uneven ink line instead of a perfect <hr> */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 8" preserveAspectRatio="none" className={`w-full h-2 ${className}`} aria-hidden>
      <path d="M2 4.5 C40 1.5 60 7 100 4 S170 2 205 5 S270 6 298 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Loader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-chalk">
      <Warli size={180} />
      <p className="hand text-lg">{label}</p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-terracotta text-center">
      <Warli size={120} />
      <p className="hand text-base text-soil max-w-[16rem]">{children}</p>
    </div>
  );
}

/* ---------- toast + celebration ---------- */
export function Toast() {
  const toast = useStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useStore.setState({ toast: null }), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div key={toast.id} className="rise fixed left-3 right-3 top-[88px] z-50 mx-auto max-w-md">
      <div className="sketch bg-haldi-light px-4 py-3 text-[15px] leading-snug font-semibold">{toast.msg}</div>
    </div>
  );
}

const PETALS = ['#E3A81C', '#B8502F', '#F6D77A', '#4F7A38'];
export function Celebrate() {
  const n = useStore((s) => s.celebrate);
  const petals = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 120,
        rot: 200 + Math.random() * 400,
        delay: Math.random() * 0.4,
        color: PETALS[i % PETALS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n],
  );
  if (n === 0) return null;
  return (
    <div key={n} aria-hidden>
      {petals.map((p, i) => (
        <span
          key={i} className="petal"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, ['--dx' as string]: `${p.dx}px`, ['--rot' as string]: `${p.rot}deg` }}
        />
      ))}
    </div>
  );
}
