import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Circle,
  FolderPlus,
  FolderSync,
  Globe,
  Images,
  Library,
  ScanFace,
  UserPlus,
} from "lucide-react";
import { AutoRefresh } from "@/components/admin-photos/AutoRefresh";
import { UsageMeter } from "@/components/admin-photos/UsageMeter";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { toCollectionCard } from "@/lib/collection-cards";
import { collectionStatus } from "@/lib/collection-status";
import { formatNumber, plural, word } from "@/lib/format";
import { cn } from "@/lib/cn";
import { db } from "@/lib/server/db";
import { can } from "@/lib/server/permissions";
import { listCollections } from "@/lib/server/repos/collections";
import { countMembers } from "@/lib/server/repos/members";
import { getCollectionsOverview, getUsage } from "@/lib/server/repos/photos";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Painel" };

function greeting(now = new Date()) {
  const h = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function PainelPage() {
  const ctx = await requireAdmin();
  const [collections, overview, members, usage] = await Promise.all([
    listCollections(db, ctx),
    getCollectionsOverview(db, ctx),
    countMembers(db, ctx),
    getUsage(db, ctx),
  ]);
  const firstName = ctx.user.name.split(" ")[0];
  const canCreate = can(ctx.role, { collection: ["create"] });

  const cards = collections.map((c) => toCollectionCard(c, overview.get(c.id)));
  const totals = cards.reduce(
    (t, c) => ({ photos: t.photos + c.photos, indexed: t.indexed + c.indexed, pending: t.pending + c.pending, failed: t.failed + c.failed }),
    { photos: 0, indexed: 0, pending: 0, failed: 0 },
  );
  const events = collections.filter((c) => c.kind === "event").length;
  const shared = cards.filter((c) => c.shared).length;
  const readyPct = totals.photos ? Math.round((totals.indexed / totals.photos) * 100) : 0;

  const steps = [
    { done: true, label: "Criar a conta da organização" },
    { done: collections.length > 0, label: "Criar o primeiro acervo ou evento", href: "/acervos/novo" },
    { done: usage.used > 0, label: "Enviar as primeiras fotos", href: cards[0] ? `/acervos/${cards[0].id}` : "/acervos" },
    { done: shared > 0, label: "Abrir um acervo por link e gerar o QR Code", href: cards[0] ? `/acervos/${cards[0].id}` : "/acervos" },
    { done: members > 1, label: "Convidar quem vai ajudar a cuidar das fotos", href: "/configuracoes/membros" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const onboarding = doneCount < steps.length;
  const nextStep = steps.find((s) => !s.done);

  // O que pede atenção agora, do mais urgente ao menos.
  const now = new Date();
  const alerts: { tone: "accent" | "warning" | "neutral"; icon: typeof AlertTriangle; text: string; href: string; cta: string }[] = [];
  for (const c of collections) {
    if (c.kind === "event" && collectionStatus(c, now).label === "Acontecendo") {
      alerts.push({ tone: "accent", icon: CalendarDays, text: `${c.name} está acontecendo agora.`, href: `/acervos/${c.id}`, cta: "Abrir evento" });
    }
  }
  if (totals.failed > 0) {
    alerts.push({ tone: "warning", icon: AlertTriangle, text: `${plural(totals.failed, "foto não pôde ser lida", "fotos não puderam ser lidas")} para a busca. Dá para tentar de novo dentro do acervo.`, href: "/acervos", cta: "Ver acervos" });
  }
  const privateWithPhotos = cards.find((c) => !c.shared && c.photos > 0);
  if (privateWithPhotos) {
    alerts.push({ tone: "neutral", icon: Globe, text: `${privateWithPhotos.name} tem fotos, mas ainda está privado. Abra por link para as pessoas se encontrarem.`, href: `/acervos/${privateWithPhotos.id}`, cta: "Abrir por link" });
  }

  const stats = [
    { label: "fotos no total", value: totals.photos, icon: Images, href: "/acervos" },
    { label: "prontas para a busca", value: totals.indexed, icon: ScanFace, href: "/acervos", accent: true },
    { label: word(collections.length - events, "acervo permanente", "acervos permanentes"), value: collections.length - events, icon: Library, href: "/acervos" },
    { label: word(events, "evento", "eventos"), value: events, icon: CalendarDays, href: "/acervos" },
  ];

  const actions = [
    canCreate && { href: "/acervos/novo?tipo=evento", icon: CalendarPlus, title: "Novo evento", text: "Com data para abrir e encerrar" },
    canCreate && { href: "/acervos/novo", icon: FolderPlus, title: "Novo acervo", text: "Para as fotos do dia a dia" },
    cards[0] && { href: `/acervos/${cards[0].id}`, icon: FolderSync, title: "Ligar pasta do Drive", text: `No acervo ${cards[0].name}` },
    { href: "/configuracoes/membros", icon: UserPlus, title: "Convidar pessoa", text: "Para ajudar com as fotos" },
  ].filter(Boolean) as { href: string; icon: typeof AlertTriangle; title: string; text: string }[];

  return (
    <div className="space-y-10">
      <AutoRefresh active={totals.pending > 0} seconds={8} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-nf-rise">
          <p className="text-sm text-nf-muted">{ctx.organization.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-nf-text sm:text-[28px]">
            {greeting(now)}, {firstName}.
          </h1>
          <p className="mt-1 text-[15px] text-nf-muted">
            {totals.pending > 0
              ? `Estamos preparando ${plural(totals.pending, "foto", "fotos")} para a busca. Esta página se atualiza sozinha.`
              : totals.photos > 0
                ? `${formatNumber(totals.indexed)} fotos prontas para as pessoas se encontrarem.`
                : "Vamos montar o primeiro acervo da sua organização."}
          </p>
        </div>
        {canCreate && (
          <Button href="/acervos/novo" icon={<FolderPlus size={16} aria-hidden />}>
            Novo acervo ou evento
          </Button>
        )}
      </div>

      {onboarding && (
        <section aria-labelledby="primeiros-passos">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-[260px_1fr]">
              <div className="flex items-center gap-5 border-b border-nf-line bg-nf-canvas/60 p-5 md:flex-col md:items-start md:border-b-0 md:border-r sm:p-6">
                <ProgressRing value={doneCount / steps.length} />
                <div>
                  <h2 id="primeiros-passos" className="font-semibold text-nf-text">Primeiros passos</h2>
                  <p className="mt-1 text-sm text-nf-muted">
                    {doneCount} de {steps.length} feitos. {nextStep && <>Próximo: {nextStep.label.toLowerCase()}.</>}
                  </p>
                </div>
              </div>
              <ol className="divide-y divide-nf-line">
                {steps.map((s) => {
                  const isNext = s === nextStep;
                  const content = (
                    <span className="flex items-center gap-3 px-5 py-3.5 text-sm">
                      {s.done ? (
                        <CheckCircle2 size={18} className="shrink-0 text-nf-success" aria-label="Feito" />
                      ) : (
                        <Circle size={18} className={cn("shrink-0", isNext ? "text-nf-accent" : "text-nf-line-strong")} aria-label="A fazer" />
                      )}
                      <span className={cn("flex-1", s.done ? "text-nf-muted line-through" : "text-nf-text", isNext && "font-medium")}>{s.label}</span>
                      {isNext && <ArrowRight size={16} className="text-nf-text transition-transform group-hover:translate-x-0.5" aria-hidden />}
                    </span>
                  );
                  return (
                    <li key={s.label}>
                      {s.href && !s.done ? (
                        <Link href={s.href} className={cn("group block transition-colors hover:bg-nf-sunken/60", isNext && "bg-nf-accent-soft/40")}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </Card>
        </section>
      )}

      {alerts.length > 0 && (
        <section aria-label="Avisos" className="space-y-2">
          {alerts.slice(0, 3).map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.text}
                href={a.href}
                className={cn(
                  "group flex animate-nf-rise items-center gap-3 rounded-nf-lg border px-4 py-3 text-sm transition-colors sm:px-5",
                  a.tone === "accent" && "border-nf-accent/25 bg-nf-accent-soft/50 hover:bg-nf-accent-soft",
                  a.tone === "warning" && "border-nf-warning/25 bg-nf-warning-soft/60 hover:bg-nf-warning-soft",
                  a.tone === "neutral" && "border-nf-line bg-nf-surface hover:border-nf-line-strong",
                )}
              >
                <Icon
                  size={17}
                  className={cn("shrink-0", a.tone === "accent" ? "text-nf-accent" : a.tone === "warning" ? "text-nf-warning" : "text-nf-muted")}
                  aria-hidden
                />
                <span className="flex-1 text-nf-text">{a.text}</span>
                <span className="hidden shrink-0 items-center gap-1 font-medium text-nf-text sm:inline-flex">
                  {a.cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </section>
      )}

      <section aria-labelledby="resumo">
        <h2 id="resumo" className="mb-3 text-xs font-semibold uppercase tracking-wider text-nf-subtle">Resumo</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.label} href={s.href} className="group rounded-nf-lg">
                <Card className="flex h-full flex-col gap-3 p-4 transition-[border-color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-nf-line-strong sm:p-5">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", s.accent ? "bg-nf-accent-soft text-nf-accent" : "bg-nf-sunken text-nf-muted")}>
                    <Icon size={17} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-2xl font-semibold text-nf-text sm:text-[28px]">
                      <CountUp value={s.value} />
                    </span>
                    <span className="block text-[13px] leading-snug text-nf-muted sm:text-sm">{s.label}</span>
                  </span>
                  {s.accent && totals.photos > 0 && (
                    <span className="mt-auto flex items-center gap-2 text-xs text-nf-muted">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-nf-sunken">
                        <span className="block h-full rounded-full bg-nf-accent transition-[width] duration-700" style={{ width: `${readyPct}%` }} />
                      </span>
                      {readyPct}%
                    </span>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
        <Card className="mt-3 p-4 sm:p-5">
          <UsageMeter used={usage.used} limit={usage.limit} planName={usage.name} showLink />
        </Card>
      </section>

      {cards.length > 0 && (
        <section aria-labelledby="recentes">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recentes" className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Acervos recentes</h2>
            <Link href="/acervos" className="inline-flex items-center gap-1 text-sm font-medium text-nf-text hover:underline">
              Ver todos <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.slice(0, 3).map((c, i) => (
              <li key={c.id} className="animate-nf-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <CollectionCard c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="atalhos">
        <h2 id="atalhos" className="mb-3 text-xs font-semibold uppercase tracking-wider text-nf-subtle">Atalhos</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.title}>
                <Link
                  href={a.href}
                  className="group flex h-full items-center gap-3 rounded-nf-lg border border-nf-line bg-nf-surface p-4 transition-colors hover:border-nf-line-strong"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-nf bg-nf-sunken text-nf-text transition-colors group-hover:bg-nf-ink group-hover:text-white">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-nf-text">{a.title}</span>
                    <span className="block truncate text-xs text-nf-muted">{a.text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" role="img" aria-label={`${pct}% concluído`}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-nf-sunken)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--color-nf-ink)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-nf-text">{pct}%</span>
    </span>
  );
}
