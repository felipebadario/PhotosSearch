"use client";

import { useActionState, useEffect } from "react";
import { managerSignInAction, type ManagerSignInState } from "@/lib/actions/manager";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Field, Input } from "@/components/ui/Input";

export function ManagerSignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<ManagerSignInState, FormData>(managerSignInAction, {});
  useEffect(() => {
    if (state.ok) window.location.assign(next);
  }, [state.ok, next]);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <Field label="E-mail">{(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.email} />}</Field>
      <Field label="Senha">{(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
      <SubmitButton pendingLabel="Entrando..." className="w-full">Entrar</SubmitButton>
    </form>
  );
}
