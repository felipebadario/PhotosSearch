"use client";

import { useActionState } from "react";
import { inviteMemberAction, type OrgFormState } from "@/lib/actions/organization";
import { Field, Input, Select } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { CopyLinkButton } from "@/components/albums/CopyLinkButton";

export function InviteForm() {
  const [state, action] = useActionState<OrgFormState, FormData>(inviteMemberAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="E-mail">{(p) => <Input {...p} name="email" type="email" required />}</Field>
        <Field label="Papel">
          {(p) => (
            <Select {...p} name="role" defaultValue="member">
              <option value="member">Editor</option>
              <option value="admin">Administrador</option>
            </Select>
          )}
        </Field>
      </div>
      <SubmitButton pendingLabel="Criando convite...">Criar convite</SubmitButton>
      {state.inviteLink && (
        <div role="status" className="rounded-nf bg-nf-accent-soft p-4 text-sm text-nf-text">
          <p>{state.ok}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-nf-sm bg-nf-surface px-3 py-2 text-[13px]">{state.inviteLink}</code>
            <CopyLinkButton url={state.inviteLink} />
          </div>
        </div>
      )}
    </form>
  );
}
