"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitLeadAction, type LeadFormState } from "@/lib/actions/leads";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";

const SEGMENTS = ["Igreja", "Escola ou faculdade", "Fotógrafo ou estúdio", "Eventos (formatura, casamento, congresso, corrida)", "Empresa", "Outro"];
const VOLUMES = ["Até 5 mil fotos", "De 5 mil a 20 mil", "De 20 mil a 50 mil", "Mais de 50 mil", "Não sei ainda"];

export type LeadDefaults = {
  name?: string;
  email?: string;
  organizationName?: string;
  plan?: string;
  source: string;
  loggedIn: boolean;
};

export function LeadForm({ defaults, plans }: { defaults: LeadDefaults; plans: { value: string; label: string }[] }) {
  const [state, action] = useActionState<LeadFormState, FormData>(submitLeadAction, {});
  const v = (k: string, fallback = "") => state.values?.[k] ?? fallback;

  if (state.ok) {
    return (
      <div role="status" className="rounded-nf-xl border border-nf-line bg-nf-surface p-6 text-center">
        <CheckCircle2 size={36} className="mx-auto text-nf-success" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-nf-text">Pedido recebido</h2>
        <p className="mt-1.5 text-[15px] text-nf-muted">
          Nossa equipe vai falar com você em até um dia útil, pelo WhatsApp ou e-mail, para montar o plano e combinar o pagamento.
        </p>
        <Button href={defaults.loggedIn ? "/painel" : "/"} variant="secondary" className="mt-5">
          {defaults.loggedIn ? "Voltar ao painel" : "Voltar ao início"}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <input type="hidden" name="source" value={defaults.source} />
      {/* Armadilha para robôs: invisível para pessoas. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Seu nome">{(p) => <Input {...p} name="name" required autoComplete="name" defaultValue={v("name", defaults.name)} />}</Field>
      <Field label="E-mail">
        {(p) => <Input {...p} name="email" type="email" required autoComplete="email" defaultValue={v("email", defaults.email)} />}
      </Field>
      <Field label="WhatsApp" hint="Com DDD. É por onde costumamos responder mais rápido.">
        {(p) => <Input {...p} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" defaultValue={v("phone")} />}
      </Field>
      <Field label="Organização">
        {(p) => <Input {...p} name="organizationName" autoComplete="organization" defaultValue={v("organizationName", defaults.organizationName)} />}
      </Field>
      <Field label="Tipo de organização">
        {(p) => (
          <Select {...p} name="segment" defaultValue={v("segment")}>
            <option value="">Escolha</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Plano de interesse">
        {(p) => (
          <Select {...p} name="plan" defaultValue={v("plan", defaults.plan ?? "")}>
            <option value="">Escolha</option>
            {plans.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Quantas fotos vocês pretendem guardar?">
        {(p) => (
          <Select {...p} name="expectedPhotos" defaultValue={v("expectedPhotos")}>
            <option value="">Escolha</option>
            {VOLUMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Quer contar mais alguma coisa?" hint="Opcional. Ex.: data do evento, quantas pessoas participam.">
        {(p) => <Textarea {...p} name="message" rows={3} maxLength={2000} defaultValue={v("message")} />}
      </Field>
      <SubmitButton pendingLabel="Enviando..." className="w-full">
        Quero assinar
      </SubmitButton>
      <p className="text-center text-xs text-nf-subtle">Sem compromisso. Usamos seus dados só para falar sobre o NossaFoto.</p>
    </form>
  );
}
