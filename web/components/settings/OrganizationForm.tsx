"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { updateOrganizationAction, type OrgFormState } from "@/lib/actions/organization";
import { Field, Input } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";

export function OrganizationForm({ name, slug, disabled }: { name: string; slug: string; disabled: boolean }) {
  const [state, action] = useActionState<OrgFormState, FormData>(updateOrganizationAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="flex items-center gap-2 text-sm text-nf-success">
          <CheckCircle2 size={16} aria-hidden /> {state.ok}
        </p>
      )}
      <Field label="Nome da organização">
        {(p) => <Input {...p} name="name" required defaultValue={name} disabled={disabled} />}
      </Field>
      <Field label="Endereço público" hint="Usado nos links dos acervos. Mudanças de endereço chegam depois.">
        {(p) => <Input {...p} value={`nossafoto.app/${slug}`} disabled readOnly />}
      </Field>
      {!disabled && <SubmitButton pendingLabel="Salvando...">Salvar</SubmitButton>}
    </form>
  );
}
