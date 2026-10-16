"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type FormState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function SignUpForm({ invitationId }: { invitationId?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUpAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {invitationId && <input type="hidden" name="invitationId" value={invitationId} />}
      <Field label="Seu nome">
        {(p) => <Input {...p} name="name" autoComplete="name" required defaultValue={state.values?.name} />}
      </Field>
      {!invitationId && (
        <Field label="Nome da organização" hint="Igreja, escola, empresa, estúdio ou evento. Dá para mudar depois.">
          {(p) => <Input {...p} name="organization" autoComplete="organization" required defaultValue={state.values?.organization} />}
        </Field>
      )}
      <Field label="E-mail">
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />}
      </Field>
      <Field label="Senha" hint="Pelo menos 8 caracteres.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" minLength={8} required />}
      </Field>
      <SubmitButton pendingLabel="Criando conta..." className="w-full">
        Criar conta
      </SubmitButton>
      <p className="text-center text-sm text-nf-muted">
        Já tem conta?{" "}
        <Link href={invitationId ? `/entrar?next=/convite/${invitationId}` : "/entrar"} className="font-medium text-nf-accent-ink hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
