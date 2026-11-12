"use client";

import { useActionState } from "react";
import { acceptInvitationAction, type FormState } from "@/lib/actions/auth";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function AcceptInvitationForm({ invitationId }: { invitationId: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvitationAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <SubmitButton pendingLabel="Entrando..." className="w-full">
        Aceitar convite
      </SubmitButton>
    </form>
  );
}
