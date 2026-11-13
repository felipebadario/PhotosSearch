"use client";

import { useState } from "react";
import { Check, Copy, FolderSync, ImageUp, QrCode, ScanFace } from "lucide-react";
import { cn } from "@/lib/cn";

const steps = [
  {
    icon: ImageUp,
    title: "A organização reúne as fotos",
    text: "Envie direto do computador ou ligue uma pasta do Google Drive. Cada subpasta vira um álbum, e fotos repetidas contam uma vez só.",
  },
  {
    icon: QrCode,
    title: "Compartilha um link com QR Code",
    text: "Abra o acervo por link e projete o QR Code no telão, no convite ou no grupo. Quem participou abre no celular, sem baixar nada.",
  },
  {
    icon: ScanFace,
    title: "Cada pessoa se encontra",
    text: "Uma selfie basta. Em segundos aparecem só as fotos em que a pessoa está, prontas para baixar e guardar.",
  },
];

const LINK = "nossafoto.app/colegio-aurora/formatura-2026";

export function HowItWorks({ qrSvg }: { qrSvg: string }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
      <ol className="space-y-2" role="tablist" aria-label="Como funciona" aria-orientation="vertical">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const on = i === active;
          return (
            <li key={s.title}>
              <button
                type="button"
                role="tab"
                id={`passo-${i}`}
                aria-selected={on}
                aria-controls="passo-painel"
                onClick={() => setActive(i)}
                className={cn(
                  "flex w-full gap-4 rounded-nf-lg border p-4 text-left transition-colors sm:p-5",
                  on ? "border-nf-line-strong bg-nf-surface" : "border-transparent hover:bg-nf-surface/70",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors",
                    on ? "bg-nf-ink text-white" : "bg-nf-sunken text-nf-muted",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold text-nf-text">
                    <Icon size={16} className={on ? "text-nf-text" : "text-nf-muted"} aria-hidden /> {s.title}
                  </span>
                  <span className={cn("mt-1 block text-sm text-nf-muted", !on && "line-clamp-1 sm:line-clamp-none")}>{s.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        id="passo-painel"
        role="tabpanel"
        aria-labelledby={`passo-${active}`}
        className="flex min-h-[340px] items-center justify-center rounded-nf-xl border border-nf-line bg-nf-surface p-6 sm:p-8"
      >
        <div key={active} className="w-full max-w-sm animate-nf-rise">
          {active === 0 && <UploadPreview />}
          {active === 1 && <SharePreview qrSvg={qrSvg} />}
          {active === 2 && <ResultPreview />}
        </div>
      </div>
    </div>
  );
}

function UploadPreview() {
  const rows = [
    { name: "Culto de domingo", n: "320 fotos", pct: 100 },
    { name: "Batismos", n: "86 fotos", pct: 100 },
    { name: "Retiro de jovens", n: "214 de 540", pct: 40 },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-nf border border-dashed border-nf-line-strong bg-nf-canvas px-4 py-5 text-center">
        <ImageUp size={20} className="mx-auto text-nf-muted" aria-hidden />
        <p className="mt-2 text-sm font-medium text-nf-text">Arraste as fotos ou uma pasta inteira</p>
        <p className="text-xs text-nf-muted">JPG, PNG ou WebP</p>
      </div>
      <div className="flex items-center gap-3 rounded-nf border border-nf-line px-3.5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-nf-sm bg-nf-sunken text-nf-muted"><FolderSync size={17} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-nf-text">Pasta do Google Drive ligada</span>
          <span className="block text-xs text-nf-muted">Confere novas fotos a cada 30 minutos</span>
        </span>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name}>
            <div className="flex justify-between text-sm">
              <span className="text-nf-text">{r.name}</span>
              <span className="tabular-nums text-nf-muted">{r.n}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-nf-sunken">
              <div className={cn("h-full rounded-full", r.pct < 100 ? "bg-nf-accent" : "bg-nf-ink")} style={{ width: `${r.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SharePreview({ qrSvg }: { qrSvg: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${LINK}`);
    } catch {
      /* a demonstração continua mesmo sem permissão */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-44 rounded-nf-lg border border-nf-line bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" aria-label="QR Code de exemplo" role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="mt-4 text-sm font-medium text-nf-text">Formatura 2026</p>
      <p className="text-xs text-nf-muted">Aberto para busca até 30/12/2026</p>
      <button
        type="button"
        onClick={copy}
        className="mt-4 flex w-full items-center gap-2 rounded-nf border border-nf-line bg-nf-canvas px-3.5 py-2.5 text-left text-sm transition-colors hover:border-nf-line-strong"
      >
        <span className="min-w-0 flex-1 truncate text-nf-muted">{LINK}</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-nf-text" aria-live="polite">
          {copied ? <><Check size={15} className="text-nf-success" aria-hidden /> Copiado</> : <><Copy size={15} aria-hidden /> Copiar</>}
        </span>
      </button>
      <p className="mt-3 text-xs text-nf-muted">Sem login e sem cadastro para quem participa.</p>
    </div>
  );
}

function ResultPreview() {
  const tones = ["#cfcdf6", "#cfcdf6", "#cfcdf6", "#cfcdf6", "#cfcdf6", "#cfcdf6"];
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nf-accent-soft text-nf-accent-ink"><ScanFace size={20} aria-hidden /></span>
        <span>
          <span className="block text-sm font-medium text-nf-text">Encontramos 6 fotos com você</span>
          <span className="block text-xs text-nf-muted">Entre 1.284 fotos, em segundos</span>
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {tones.map((t, i) => (
          <li key={i} className="relative aspect-square rounded-nf ring-2 ring-nf-accent" style={{ backgroundColor: t, animationDelay: `${i * 60}ms` }}>
            <svg viewBox="0 0 32 32" className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2" aria-hidden>
              <circle cx="15" cy="17" r="6.5" fill="none" stroke="#fff" strokeWidth="2.6" />
              <circle cx="23.5" cy="8.5" r="2.6" fill="#4f46e5" />
            </svg>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <span className="flex h-10 flex-1 items-center justify-center rounded-nf bg-nf-ink text-sm font-medium text-white">Ver minhas fotos</span>
        <span className="flex h-10 items-center justify-center rounded-nf border border-nf-line px-3.5 text-sm text-nf-text">Buscar de novo</span>
      </div>
    </div>
  );
}
