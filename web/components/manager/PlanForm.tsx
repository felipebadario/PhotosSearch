"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { setPlanAction, type PlanFormState } from "@/lib/actions/manager";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Field, Input, Select } from "@/components/ui/Input";

const STATUS_LABEL: Record<string, string> = { active: "Ativa (pagando)", trialing: "Em teste", past_due: "Pagamento atrasado", canceled: "Cancelada" };

export function PlanForm({
  organizationId,
  plans,
  current,
}: {
  organizationId: string;
  plans: { id: string; name: string; photoLimit: number | null }[];
  current: { planId: string; status: string | null; customLimit: number | null };
}) {
  const [state, action] = useActionState<PlanFormState, FormData>(setPlanAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="flex items-start gap-2 rounded-nf bg-nf-success-soft px-3.5 py-3 text-sm text-nf-success">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden /> {state.ok}
        </p>
      )}
      <input type="hidden" name="organizationId" value={organizationId} />
      <Field label="Plano">
        {(p) => (
          <Select {...p} name="planId" defaultValue={current.planId}>
            {plans.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} {pl.photoLimit != null ? `(${pl.photoLimit.toLocaleString("pt-BR")} fotos)` : "(limite sob medida)"}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Situação da assinatura" hint="Vale para planos pagos. Avaliação ignora este campo.">
        {(p) => (
          <Select {...p} name="status" defaultValue={current.status ?? "active"}>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Limite de fotos sob medida" hint="Opcional. Em branco, usa o limite do plano. Obrigatório para Enterprise.">
        {(p) => <Input {...p} name="photoLimit" inputMode="numeric" defaultValue={current.customLimit ?? ""} placeholder="Ex.: 100000" />}
      </Field>
      <SubmitButton pendingLabel="Salvando...">Salvar plano</SubmitButton>
    </form>
  );
}
