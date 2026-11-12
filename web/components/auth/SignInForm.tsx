"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type FormState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail">
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />}
      </Field>
      <Field label="Senha">
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <SubmitButton pendingLabel="Entrando..." className="w-full">
        Entrar
      </SubmitButton>
      <p className="text-center text-sm text-nf-muted">
        Ainda não usa o NossaFoto?{" "}
        <Link href={next?.startsWith("/convite/") ? `/criar-conta?convite=${next.slice(9)}` : "/criar-conta"} className="font-medium text-nf-accent-ink hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
