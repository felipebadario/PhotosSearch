"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Library } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { CollectionFormState } from "@/lib/actions/collections";

export type CollectionFormValues = {
  id?: string;
  kind: "permanent" | "event";
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  publicUntil: string;
  retentionDays: string;
  allowDownload: boolean;
};

const kinds = [
  {
    value: "permanent" as const,
    title: "Acervo permanente",
    text: "Para fotos contínuas, organizadas em álbuns ao longo do tempo.",
    icon: Library,
  },
  {
    value: "event" as const,
    title: "Evento",
    text: "Para um período definido, com acesso público que encerra sozinho.",
    icon: CalendarDays,
  },
];

export function CollectionForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: CollectionFormState, form: FormData) => Promise<CollectionFormState>;
  initial: CollectionFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<CollectionFormState, FormData>(action, {});
  const v = { ...initial, ...(state.values ?? {}) } as Record<string, string | boolean>;
  const [kind, setKind] = useState<"permanent" | "event">(initial.kind);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-nf-text">Tipo</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {kinds.map((k) => {
            const Icon = k.icon;
            const selected = kind === k.value;
            return (
              <label
                key={k.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-nf-lg border bg-nf-surface p-4 transition-colors",
                  selected ? "border-nf-accent shadow-nf-focus" : "border-nf-line hover:border-nf-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  // Não controlado: o React restaura defaultChecked quando reinicia o formulário após um erro.
                  defaultChecked={(v.kind ?? initial.kind) === k.value}
                  onChange={() => setKind(k.value)}
                  className="sr-only"
                />
                <Icon size={20} className={selected ? "text-nf-accent" : "text-nf-muted"} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-nf-text">{k.title}</span>
                  <span className="mt-0.5 block text-sm text-nf-muted">{k.text}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label="Nome">
        {(p) => <Input {...p} name="name" required maxLength={120} defaultValue={String(v.name ?? "")} />}
      </Field>

      <Field label="Descrição" hint="Opcional. Aparece para quem abrir o link.">
        {(p) => <Textarea {...p} name="description" rows={3} defaultValue={String(v.description ?? "")} />}
      </Field>

      {kind === "event" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Início">
            {(p) => <Input {...p} name="startsAt" type="date" required defaultValue={String(v.startsAt ?? "")} />}
          </Field>
          <Field label="Fim">
            {(p) => <Input {...p} name="endsAt" type="date" required defaultValue={String(v.endsAt ?? "")} />}
          </Field>
          <Field label="Aberto até" hint="Depois disso, o link mostra que o evento encerrou.">
            {(p) => <Input {...p} name="publicUntil" type="date" defaultValue={String(v.publicUntil ?? "")} />}
          </Field>
        </div>
      )}

      <Field
        label="Guardar as fotos por (dias)"
        hint={kind === "event" ? "Opcional. Contado a partir do encerramento; depois, os dados de busca são apagados." : "Opcional. Em branco, ficam enquanto a assinatura estiver ativa."}
      >
        {(p) => <Input {...p} name="retentionDays" type="number" min={1} max={3650} inputMode="numeric" defaultValue={String(v.retentionDays ?? "")} className="sm:max-w-[200px]" />}
      </Field>

      <label className="flex items-center gap-3 text-sm text-nf-text">
        <input
          type="checkbox"
          name="allowDownload"
          defaultChecked={v.allowDownload === true || v.allowDownload === "on"}
          className="h-5 w-5 rounded border-nf-line-strong accent-[var(--color-nf-accent)]"
        />
        Permitir que os participantes baixem as fotos encontradas
      </label>

      <SubmitButton pendingLabel="Salvando...">{submitLabel}</SubmitButton>
    </form>
  );
}
