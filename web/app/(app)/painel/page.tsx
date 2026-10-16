import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Circle, Library, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/server/db";
import { countCollections } from "@/lib/server/repos/collections";
import { countMembers } from "@/lib/server/repos/members";
import { requireAdmin } from "@/lib/server/session";
import { word } from "@/lib/format";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage() {
  const ctx = await requireAdmin();
  const [collections, members] = await Promise.all([countCollections(db, ctx), countMembers(db, ctx)]);
  const firstName = ctx.user.name.split(" ")[0];

  const stats = [
    { label: word(collections.permanent, "acervo permanente", "acervos permanentes"), value: collections.permanent, icon: Library, href: "/acervos" },
    { label: word(collections.event, "evento", "eventos"), value: collections.event, icon: CalendarDays, href: "/acervos" },
    { label: word(members, "membro", "membros"), value: members, icon: Users, href: "/configuracoes/membros" },
  ];

  const steps = [
    { done: true, label: "Criar a conta da organização" },
    { done: collections.permanent + collections.event > 0, label: "Criar o primeiro acervo ou evento", href: "/acervos/novo" },
    { done: members > 1, label: "Convidar quem vai ajudar a cuidar das fotos", href: "/configuracoes/membros" },
    { done: false, label: "Enviar fotos (chega na próxima etapa)" },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-nf-muted">{ctx.organization.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-nf-text sm:text-[28px]">Olá, {firstName}.</h1>
        </div>
        <Button href="/acervos/novo" icon={<Plus size={16} aria-hidden />}>
          Novo acervo ou evento
        </Button>
      </div>

      <section aria-labelledby="resumo">
        <h2 id="resumo" className="mb-3 text-xs font-semibold uppercase tracking-wider text-nf-subtle">
          Resumo
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.label} href={s.href} className="rounded-nf-lg">
                <Card className="flex h-full flex-col gap-1 p-4 transition-colors hover:border-nf-line-strong sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nf-sunken text-nf-muted sm:flex">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-2xl font-semibold tabular-nums text-nf-text">{s.value}</span>
                    <span className="block text-[13px] leading-snug text-nf-muted sm:text-sm">{s.label}</span>
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-nf-muted">
          Fotos indexadas, buscas e consumo da franquia aparecem aqui assim que o envio de fotos estiver disponível.
        </p>
      </section>

      <section aria-labelledby="primeiros-passos">
        <h2 id="primeiros-passos" className="mb-3 text-xs font-semibold uppercase tracking-wider text-nf-subtle">
          Primeiros passos
        </h2>
        <Card className="divide-y divide-nf-line">
          {steps.map((s) => {
            const content = (
              <span className="flex items-center gap-3 px-5 py-4 text-sm">
                {s.done ? (
                  <CheckCircle2 size={18} className="text-nf-success" aria-label="Feito" />
                ) : (
                  <Circle size={18} className="text-nf-line-strong" aria-label="A fazer" />
                )}
                <span className={s.done ? "text-nf-muted line-through" : "text-nf-text"}>{s.label}</span>
              </span>
            );
            return s.href && !s.done ? (
              <Link key={s.label} href={s.href} className="block transition-colors hover:bg-nf-sunken/60">
                {content}
              </Link>
            ) : (
              <div key={s.label}>{content}</div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
