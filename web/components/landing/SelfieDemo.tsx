"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, ScanFace } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/** Tons neutros que lembram uma folha de contato. Sem fotos de banco. */
const TONES = ["#cfcec7", "#dcdbd5", "#c9c8c0", "#d6d5ce", "#e1e0da", "#cdccc5", "#d9d8d1", "#c6c5bd", "#dedcd6", "#d1d0c9", "#c9c8c1", "#dad9d3"];
const MATCHES = new Set([1, 4, 6, 9, 11]);
type Phase = "idle" | "scanning" | "found";

/**
 * Demonstração da busca por selfie na landing page. Toca sozinha uma vez quando
 * aparece na tela e pode ser repetida pelo botão. Não usa câmera nem rede.
 */
export function SelfieDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cursor, setCursor] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const played = useRef(false);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const run = useCallback(() => {
    clear();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("scanning");
    setCursor(-1);
    if (reduced) {
      timers.current.push(window.setTimeout(() => setPhase("found"), 400));
      return;
    }
    TONES.forEach((_, i) => timers.current.push(window.setTimeout(() => setCursor(i), 350 + i * 110)));
    timers.current.push(window.setTimeout(() => { setCursor(-1); setPhase("found"); }, 350 + TONES.length * 110 + 250));
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played.current) {
          played.current = true;
          timers.current.push(window.setTimeout(run, 700));
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, [run]);

  const found = phase === "found";
  return (
    <div ref={root} className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px]">
      <div className="rounded-[2.25rem] border border-nf-line bg-nf-surface p-3 shadow-nf-float">
        <div className="rounded-[1.75rem] bg-nf-canvas px-4 pb-5 pt-3">
          <div className="mx-auto h-5 w-24 rounded-full bg-nf-ink" aria-hidden />
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold tracking-[-0.03em] text-nf-text">
            <LogoMark size={16} /> NossaFoto
          </div>
          <p className="mt-3 text-lg font-semibold leading-tight text-nf-text">Formatura 2026</p>
          <p className="text-xs text-nf-muted">1.284 fotos · Colégio Aurora</p>

          <button
            type="button"
            onClick={run}
            disabled={phase === "scanning"}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-nf bg-nf-accent text-sm font-medium text-white transition-colors hover:bg-nf-accent-hover disabled:opacity-90"
          >
            {phase === "scanning" ? (
              <>
                <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
                  <span className="absolute inset-0 rounded-full bg-white/50 animate-nf-pulse-ring" />
                  <ScanFace size={16} />
                </span>
                Procurando você…
              </>
            ) : found ? (
              <><RotateCcw size={15} aria-hidden /> Buscar de novo</>
            ) : (
              <><ScanFace size={16} aria-hidden /> Buscar com selfie</>
            )}
          </button>
          <p className="mt-2 text-[11px] leading-snug text-nf-muted">Sua selfie é usada só nesta busca e não fica guardada.</p>

          <div className="mt-3 h-7" aria-live="polite">
            {found && (
              <span className="inline-flex animate-nf-rise items-center gap-1.5 rounded-full bg-nf-accent-soft px-2.5 py-1 text-xs font-medium text-nf-accent-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {MATCHES.size} fotos com você
              </span>
            )}
          </div>

          <ul className="grid grid-cols-3 gap-1.5" aria-label="Fotos do evento">
            {TONES.map((tone, i) => {
              const match = found && MATCHES.has(i);
              return (
                <li
                  key={i}
                  className={cn(
                    "relative aspect-square rounded-[10px] transition-all duration-300 ease-out",
                    match && "ring-2 ring-nf-accent",
                    found && !match && "opacity-35",
                    cursor === i && "ring-2 ring-nf-accent/50",
                  )}
                  style={{ backgroundColor: match ? "#cfcdf6" : tone }}
                >
                  {match && (
                    <svg viewBox="0 0 32 32" className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-nf-fade-in" aria-hidden>
                      <circle cx="15" cy="17" r="6.5" fill="none" stroke="#fff" strokeWidth="2.6" />
                      <circle cx="23.5" cy="8.5" r="2.6" fill="#4f46e5" />
                    </svg>
                  )}
                  {match && <span className="sr-only">Você aparece nesta foto</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
