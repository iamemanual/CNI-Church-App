/**
 * LiquidDock.tsx — single-file "liquid glass" tab bar (React + TypeScript, zero dependencies)
 * Recreated from the screen recording: frosted iridescent pill, flat selected pill at rest,
 * and a lifted glass lens that magnifies the blue icon, stretches with speed and springs.
 *
 * Usage:   <LiquidDock value={tab} onChange={setTab} />
 * Preview: <LiquidDockDemo />   (dark scene + autoplay taps, like the video)
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ───────────────────────────── STYLES (auto-injected) ───────────────────────────── */
const CSS = `
.ld{--h:64px;--blue:#0b5be0;--ink:#1b1522;
  position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);
  width:min(92vw,400px);height:var(--h);z-index:50;touch-action:none;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Inter,system-ui,sans-serif}
.ld-bar{position:absolute;inset:0;border-radius:999px;will-change:transform}

/* frosted, iridescent bar */
.ld-glass{position:absolute;inset:0;border-radius:999px;overflow:hidden;
  background:linear-gradient(180deg,rgba(236,232,244,.66),rgba(226,222,236,.56) 55%,rgba(236,232,244,.62));
  -webkit-backdrop-filter:blur(18px) saturate(160%) brightness(1.12);
  backdrop-filter:blur(18px) saturate(160%) brightness(1.12);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.55),inset 0 1.5px 2px rgba(255,255,255,.95),
    inset 0 -1.5px 2px rgba(255,255,255,.55),inset 8px 0 14px -10px rgba(255,255,255,.9),
    0 10px 30px rgba(0,0,0,.28)}
.ld-fx{position:absolute;inset:0;width:100%;height:100%}

/* tab rows: base (dark) + clone (blue, lives inside the lens) */
.ld-row{position:absolute;top:0;left:0;height:var(--h);display:flex;padding:0 4px;box-sizing:border-box}
.ld-base{right:0}
.ld-base{-webkit-mask-image:linear-gradient(90deg,#000 var(--a,-9999px),transparent var(--a,-9999px),transparent var(--b,-9999px),#000 var(--b,-9999px));
  mask-image:linear-gradient(90deg,#000 var(--a,-9999px),transparent var(--a,-9999px),transparent var(--b,-9999px),#000 var(--b,-9999px))}
.ld-tab{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:0;margin:0;background:none;border:0;color:var(--ink);cursor:pointer;outline:none;
  font:600 11px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Inter,system-ui,sans-serif;
  letter-spacing:.1px;transform:translateY(-1px)}
.ld-tab svg{width:29px;height:29px;display:block;overflow:visible}
.ld-tab:focus-visible{box-shadow:inset 0 0 0 2px var(--blue);border-radius:30px}
.ld-clone .ld-tab{color:var(--blue)}

/* the selector: flat pill at rest  →  lifted glass lens while touched / moving  (--f = 0..1) */
.ld-lens{position:absolute;left:0;top:0;overflow:hidden;pointer-events:none;will-change:transform;
  --f:0;box-shadow:0 8px 18px rgba(30,20,50,calc(.24 * var(--f)))}
.ld-pill{position:absolute;inset:0;border-radius:inherit;opacity:calc(1 - var(--f));
  background:rgba(96,94,110,.20);
  box-shadow:inset 0 0 0 .5px rgba(255,255,255,.28),inset 0 2px 6px rgba(60,50,80,.12),inset 0 -1.5px 2px rgba(255,255,255,.5)}
.ld-body{position:absolute;inset:0;border-radius:inherit;opacity:var(--f);
  -webkit-backdrop-filter:blur(2px) saturate(1.7) brightness(1.08);backdrop-filter:blur(2px) saturate(1.7) brightness(1.08);
  background:
    radial-gradient(120% 75% at 50% 45%,rgba(255,255,255,.7),rgba(255,255,255,0) 72%),
    linear-gradient(to bottom,rgba(255,255,255,0) 0,rgba(244,236,248,.62) 10px,rgba(248,242,251,.66) calc(100% - 18px),rgba(255,255,255,0) 100%);
  box-shadow:inset 0 10px 12px -9px #fff,inset 6px 0 9px -6px rgba(255,120,190,.5),inset -6px 0 9px -6px rgba(90,170,255,.5)}
.ld-in{position:absolute;inset:0;will-change:transform}
.ld-clone{left:0;top:0}
.ld-dark{position:absolute;left:9%;right:9%;bottom:0;height:17px;opacity:var(--f);
  border-radius:0 0 50% 50%/0 0 100% 100%;filter:blur(.8px);
  background:linear-gradient(to top,rgba(12,10,18,.62),rgba(12,10,18,0));
  box-shadow:0 1px 0 rgba(255,170,130,.55),0 2px 1px rgba(120,190,255,.35)}
.ld-rim{position:absolute;inset:0;border-radius:inherit;padding:1.4px;opacity:var(--f);
  background:conic-gradient(from 0deg,rgba(255,255,255,.95),rgba(150,255,215,.7) 12%,rgba(255,255,255,.85) 25%,
    rgba(255,120,200,.7) 40%,rgba(255,255,255,.9) 50%,rgba(120,170,255,.7) 62%,rgba(255,255,255,.9) 75%,
    rgba(255,205,120,.7) 88%,rgba(255,255,255,.95));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);mask-composite:exclude}

/* demo scene */
.ld-scene{position:fixed;inset:0;overflow:hidden;background:#0c0b10}
.ld-scene::before{content:"";position:absolute;width:150vmax;height:150vmax;left:44%;top:-96vmax;border-radius:50%;
  background:radial-gradient(circle at 30% 78%,#fff 0,#fff 18%,#e8e4ff 30%,rgba(120,110,200,.25) 44%,transparent 60%);filter:blur(2px)}
.ld-scene::after{content:"";position:absolute;inset:auto -10% -6% -10%;height:34%;
  background:radial-gradient(60% 80% at 20% 100%,rgba(255,150,90,.55),transparent 70%)}
`;
if (typeof document !== "undefined" && !document.getElementById("liquid-dock-css")) {
  const s = document.createElement("style");
  s.id = "liquid-dock-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ───────────────────────────────── ICONS ───────────────────────────────── */
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>{children}</svg>
);
const Today = () => (
  <Svg>
    <rect x="4.4" y="2.4" width="15.2" height="19.2" rx="3.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <rect x="8" y="6" width="8" height="1.7" rx=".85" />
    <rect x="8" y="9.2" width="5" height="1.7" rx=".85" />
    <rect x="8" y="12.6" width="8" height="5.6" rx="1.3" />
  </Svg>
);
const Games = () => (
  <Svg>
    <g transform="translate(12 12) scale(1.22) rotate(45) translate(-12 -12)">
      <path fillRule="evenodd" d="M12 1.6c2.9 2.4 4.1 5.9 3.6 10.2l1.7 2.3v3.2l-2.5-1.3H9.2l-2.5 1.3v-3.2l1.7-2.3C7.9 7.5 9.1 4 12 1.6zm0 5.1a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z" />
      <path d="M10.2 17.4h3.6c.1 1.4-.5 2.7-1.8 3.9-1.3-1.2-1.9-2.5-1.8-3.9z" />
    </g>
    
  </Svg>
);
const Apps = () => (
  <Svg>
    <polygon points="12,3.4 20,7.6 12,11.8 4,7.6" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M3.8 11.7 12 15.9l8.2-4.2M3.8 15.6 12 19.8l8.2-4.2" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const Arcade = () => (
  <Svg>
    <circle cx="12" cy="4.4" r="2.5" />
    <rect x="11.3" y="6.4" width="1.4" height="5.2" fill="#fff" fillOpacity=".92" />
    <polygon points="12,9.6 20.2,13.2 12,16.8 3.8,13.2" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <ellipse cx="7.9" cy="13" rx="1.15" ry=".7" fill="#fff" fillOpacity=".9" transform="rotate(24 7.9 13)" />
    <path d="M3.9 16.7 12 20.4l8.1-3.7" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const Search = () => (
  <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeLinecap="round">
    <circle cx="10.4" cy="10.4" r="6.6" strokeWidth="2.3" />
    <path d="M15.4 15.4 20.6 20.6" strokeWidth="2.8" />
  </svg>
);

export type DockItem = { id: string; label: string; icon: ReactNode };
export const DEFAULT_ITEMS: DockItem[] = [
  { id: "today", label: "Today", icon: <Today /> },
  { id: "games", label: "Games", icon: <Games /> },
  { id: "apps", label: "Apps", icon: <Apps /> },
  { id: "arcade", label: "Arcade", icon: <Arcade /> },
  { id: "search", label: "Search", icon: <Search /> },
];

/* ───────────────────────────────── COMPONENT ───────────────────────────────── */
type Props = { items?: DockItem[]; value?: number; onChange?: (index: number) => void };

export function LiquidDock({ items = DEFAULT_ITEMS, value, onChange }: Props) {
  const [inner, setInner] = useState(1);
  const cur = value ?? inner;
  const bar = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const lensIn = useRef<HTMLDivElement>(null);
  const clone = useRef<HTMLDivElement>(null);
  const go = useRef<(i: number) => void>(() => {});
  const pick = useRef<(i: number) => void>(() => {});
  pick.current = (i) => { setInner(i); onChange?.(i); };

  useEffect(() => {
    const root = bar.current!.parentElement as HTMLElement;
    const B = bar.current!, R = base.current!, L = lens.current!, LI = lensIn.current!, C = clone.current!;
    const n = items.length, PAD = 4;
    let W = 0, H = 0, tw = 0;
    let x = 0, v = 0, target = 0;            // lens centre (px) — spring
    let lift = 0, liftT = 0, pr = 0, prT = 0; // lens lift / bar press (0..1)
    let holdUntil = 0, down = false, dragging = false, startX = 0, idx = cur, raf = 0, last = 0;
    const centre = (i: number) => PAD + (i + 0.5) * tw;
    const clamp = (p: number) => Math.max(centre(0), Math.min(centre(n - 1), p));

    const paint = () => {
      const f = lift, stretch = Math.min(Math.abs(v) / 2400, 0.28);
      const w = tw + 8 + 8 * f, h = H - 8 + 24 * f, top = 4 - 10 * f, left = x - w / 2;
      L.style.width = w + "px"; L.style.height = h + "px";
      L.style.borderRadius = 28 + 4 * f + "px";
      L.style.transform = `translate3d(${left}px,${top}px,0) scale(${1 + stretch},${1 - stretch * 0.3})`;
      L.style.setProperty("--f", f.toFixed(3));
      LI.style.transform = `scale(${1 + 0.28 * f}) skewX(${(-v / 2600).toFixed(2)}deg)`;
      LI.style.filter = Math.abs(v) > 500 ? `blur(${Math.min(Math.abs(v) / 1500, 1.8).toFixed(2)}px)` : "none";
      C.style.transform = `translate3d(${-left}px,${-top}px,0)`;
      R.style.setProperty("--a", left + 1 + "px"); R.style.setProperty("--b", left + w - 1 + "px");
      B.style.transform = `scale(${1 + 0.04 * pr})`;
    };
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000 || 0.016, 0.032); last = t;
      if (!down && t > holdUntil) liftT = 0;
      const k = dragging ? 620 : 190, c = dragging ? 42 : 19;         // spring: underdamped → overshoot
      v += ((target - x) * k - v * c) * dt; x += v * dt;
      lift += (liftT - lift) * Math.min(1, dt * (liftT > lift ? 16 : 6));
      pr += (prT - pr) * Math.min(1, dt * 14);
      paint();
      const busy = Math.abs(v) > 0.5 || Math.abs(target - x) > 0.1 || Math.abs(liftT - lift) > 0.003 ||
        Math.abs(prT - pr) > 0.003 || t < holdUntil || down;
      if (busy) raf = requestAnimationFrame(step);
      else { x = target; v = 0; lift = liftT; pr = prT; paint(); raf = 0; }
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    const wake = (ms = 700) => { holdUntil = performance.now() + ms; liftT = 1; kick(); };
    const measure = () => {
      W = root.clientWidth; H = root.clientHeight; tw = (W - PAD * 2) / n;
      C.style.width = W + "px"; C.style.height = H + "px";
      x = target = centre(idx); v = 0; lift = liftT = 0; pr = prT = 0; paint();
    };
    go.current = (i) => { idx = i; target = centre(i); wake(); };

    const px = (e: PointerEvent) => e.clientX - root.getBoundingClientRect().left;
    const onDown = (e: PointerEvent) => {
      down = true; dragging = false; startX = e.clientX; liftT = 1; prT = 1;
      target = clamp(centre(Math.max(0, Math.min(n - 1, Math.floor((px(e) - PAD) / tw)))));
      root.setPointerCapture(e.pointerId); kick();
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (!dragging && Math.abs(e.clientX - startX) > 4) dragging = true;
      if (dragging) { target = clamp(px(e)); kick(); }
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false; prT = 0;
      const p = dragging ? x : px(e);
      const i = Math.max(0, Math.min(n - 1, Math.floor((p - PAD) / tw)));
      dragging = false; idx = i; target = centre(i); wake(); pick.current(i);
    };
    root.addEventListener("pointerdown", onDown); root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp); root.addEventListener("pointercancel", onUp);
    const ro = new ResizeObserver(measure); ro.observe(root); measure();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      root.removeEventListener("pointerdown", onDown); root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp); root.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } go.current(cur); }, [cur]);

  const tabs = (isClone: boolean) => items.map((it, i) => (
    <button key={it.id} className="ld-tab" role={isClone ? undefined : "tab"}
      aria-selected={isClone ? undefined : i === cur} tabIndex={isClone ? -1 : 0}
      onClick={isClone ? undefined : (e) => { if (e.detail === 0) pick.current(i); }}>
      {it.icon}<span>{it.label}</span>
    </button>
  ));

  return (
    <nav className="ld" role="tablist">
      <div className="ld-bar" ref={bar}>
        <div className="ld-glass">
          <svg className="ld-fx" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden>
            <defs>
              <filter id="ldb1" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="2.6" /></filter>
              <filter id="ldb2" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="7" /></filter>
              <filter id="ldb3" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="1" /></filter>
            </defs>
            <ellipse cx="44" cy="52" rx="54" ry="12" fill="#ff9a5c" opacity=".6" filter="url(#ldb2)" />
            <ellipse cx="20" cy="46" rx="28" ry="12" fill="#ff7fb0" opacity=".35" filter="url(#ldb2)" />
            <path d="M10 53C52 24 112 20 168 40S198 56 186 58" fill="none" stroke="#3ea3ff" strokeWidth="5" strokeLinecap="round" opacity=".9" filter="url(#ldb1)" />
            <path d="M10 53C52 24 112 20 168 40S198 56 186 58" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".75" filter="url(#ldb3)" />
            <ellipse cx="262" cy="52" rx="40" ry="10" fill="#ffa070" opacity=".42" filter="url(#ldb2)" />
            <path d="M232 51C250 40 272 42 294 53" fill="none" stroke="#4ab2ff" strokeWidth="3.4" strokeLinecap="round" opacity=".8" filter="url(#ldb1)" />
            <ellipse cx="352" cy="14" rx="62" ry="18" fill="#ffc4e2" opacity=".5" filter="url(#ldb2)" />
            <ellipse cx="205" cy="8" rx="80" ry="7" fill="#fff" opacity=".55" filter="url(#ldb2)" />
          </svg>
        </div>
        <div className="ld-row ld-base" ref={base}>{tabs(false)}</div>
        <div className="ld-lens" ref={lens} aria-hidden>
          <div className="ld-pill" />
          <div className="ld-body" />
          <div className="ld-in" ref={lensIn}>
            <div className="ld-row ld-clone" ref={clone}>{tabs(true)}</div>
          </div>
          <div className="ld-dark" />
          <div className="ld-rim" />
        </div>
      </div>
    </nav>
  );
}
export default LiquidDock;

/* ───────────────────── Demo: same scene + tap sequence as the video ───────────────────── */
const SEQ: [number, number][] = [[0,1],[500,3],[1250,0],[2000,2],[2500,3],[3000,1],[3250,0],[4250,1],[4500,2],
  [4750,3],[5250,2],[5500,0],[6750,1],[7000,2],[7500,3],[7750,2],[8250,1],[8750,4],[9750,3],[10250,0],
  [10750,1],[11000,2],[11500,3],[12000,1],[12250,0],[13000,2],[13250,3],[14000,1],[14250,0]];
export function LiquidDockDemo({ autoplay = true }: { autoplay?: boolean }) {
  const [tab, setTab] = useState(1);
  const auto = useRef(autoplay);
  useEffect(() => {
    const ids: number[] = []; let loop = 0;
    const run = () => { SEQ.forEach(([t, i]) => ids.push(window.setTimeout(() => auto.current && setTab(i), t)));
      loop = window.setTimeout(run, 15300); };
    run();
    return () => { ids.forEach(clearTimeout); clearTimeout(loop); };
  }, []);
  return (
    <div className="ld-scene" onPointerDown={() => (auto.current = false)}>
      <LiquidDock value={tab} onChange={(i) => { auto.current = false; setTab(i); }} />
    </div>
  );
}
