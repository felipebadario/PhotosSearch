"use client";

import { useState } from "react";
import { CalendarDays, Check, Library } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

const STOPS = [1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000];
const TIERS = [
  { name: "Start", limit: 5000 },
  { name: "Pro", limit: 20000 },
  { name: "Business", limit: 50000 },
  { name: "Enterprise", limit: null as number | null },
];

const included = [
  "Busca por selfie para todos que participam",
  "Envio direto e pastas do Google Drive",
  "Acervos permanentes e eventos com prazo",
  "Link público e QR Code",
  "Equipe com papéis e convites",
];

export function PlanEstimator() {
  const [mode, setMode] = useState<"business" | "events">("business");
  const [stop, setStop] = useState(3);
  const photos = STOPS[stop];
  const max = stop === STOPS.length - 1;
  const tier = TIERS.find((t) => t.limit != null && photos <= t.limit) ?? TIERS[3];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="rounded-nf-xl border border-nf-line bg-nf-surface p-5 sm:p-8">
        <div role="tablist" aria-label="Tipo de plano" className="inline-flex rounded-full bg-nf-sunken p-1">
          {[
            { v: "business" as const, label: "Business", icon: Library },
            { v: "events" as const, label: "Events", icon: CalendarDays },
          ].map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.v}
                type="button"
                role="tab"
                aria-selected={mode === o.v}
                onClick={() => setMode(o.v)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  mode === o.v ? "bg-nf-surface text-nf-text shadow-sm" : "text-nf-muted hover:text-nf-text",
                )}
              >
                <Icon size={15} aria-hidden /> <span className="hidden sm:inline">NossaFoto</span> {o.label}
              </button>
            );
          })}
        </div>

        {mode === "business" ? (
          <div key="b" className="animate-nf-fade-in">
            <p className="mt-6 text-[15px] text-nf-muted">Assinatura mensal pelo volume de fotos guardadas. Para quem tem acervo o ano todo.</p>
            <label htmlFor="volume" className="mt-8 block text-sm font-medium text-nf-text">Quantas fotos sua organização guarda?</label>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-nf-text" aria-live="polite">
              {max ? "Mais de " : "Até "}
              {formatNumber(photos)} <span className="text-lg font-medium text-nf-muted">fotos</span>
            </p>
            <input
              id="volume"
              type="range"
              min={0}
              max={STOPS.length - 1}
              step={1}
              value={stop}
              onChange={(e) => setStop(Number(e.target.value))}
              aria-valuetext={`${max ? "Mais de" : "Até"} ${formatNumber(photos)} fotos`}
              className="mt-5 w-full accent-[var(--color-nf-ink)]"
            />
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIERS.map((t) => {
                const on = t.name === tier.name;
                return (
                  <li
                    key={t.name}
                    className={cn(
                      "rounded-nf-lg border p-3.5 transition-colors",
                      on ? "border-nf-ink bg-nf-ink text-white" : "border-nf-line bg-nf-canvas text-nf-text",
                    )}
                  >
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className={cn("mt-0.5 text-xs", on ? "text-white/75" : "text-nf-muted")}>
                      {t.limit ? `Até ${formatNumber(t.limit)} fotos` : "Volume sob medida"}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-nf-muted">
              Sugestão para você: <span className="font-medium text-nf-text">{tier.name}</span>. Cada foto conta uma vez, mesmo que esteja em vários acervos.
            </p>
          </div>
        ) : (
          <div key="e" className="animate-nf-fade-in">
            <p className="mt-6 text-[15px] text-nf-muted">Pagamento único por evento, sem assinatura. Para quem faz um evento de cada vez.</p>
            <ul className="mt-6 space-y-3 text-[15px] text-nf-text">
              {[
                "A página abre na data do evento e encerra sozinha no prazo que você escolher.",
                "Ideal para formaturas, casamentos, congressos e corridas.",
                "O valor acompanha o tamanho do evento, não o número de participantes.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-nf-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-nf-xl bg-nf-ink p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-white/70">Todos os planos incluem</p>
        <ul className="mt-4 space-y-3">
          {included.map((t) => (
            <li key={t} className="flex gap-3 text-[15px]">
              <Check size={18} className="mt-0.5 shrink-0 text-white" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-nf-lg bg-white/8 p-4">
          <p className="font-semibold">Participantes nunca pagam.</p>
          <p className="mt-1 text-sm text-white/75">Quem procura as próprias fotos não paga nada, não importa quantas pessoas sejam.</p>
        </div>
        <div className="mt-auto pt-8">
          <p className="text-sm text-white/75">O NossaFoto está em fase de testes: criar a conta da organização não tem custo. Os valores dos planos saem em breve.</p>
          <Button href="/criar-conta" variant="secondary" size="lg" className="mt-4 w-full border-transparent">
            Começar sem custo
          </Button>
        </div>
      </div>
    </div>
  );
}
