"use client";

import { useActionState } from "react";
import { createOrganizationAction, type FormState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function CreateOrganizationForm() {
  const [state, action] = useActionState<FormState, FormData>(createOrganizationAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <Field label="Nome da organização">
        {(p) => <Input {...p} name="organization" required defaultValue={state.values?.organization} />}
      </Field>
      <SubmitButton pendingLabel="Criando..." className="w-full">
        Criar organização
      </SubmitButton>
    </form>
  );
}
