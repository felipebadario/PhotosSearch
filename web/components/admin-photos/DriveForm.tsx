"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input, Label } from "@/components/ui/Input";
import { addDriveSourceAction, type DriveFormState } from "@/lib/actions/drive";

export function DriveForm({ collectionId }: { collectionId: string }) {
  const [state, action] = useActionState<DriveFormState, FormData>(addDriveSourceAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="collectionId" value={collectionId} />
      <div>
        <Label htmlFor="drive-link">Link da pasta</Label>
        <Input id="drive-link" name="link" type="url" inputMode="url" required placeholder="https://drive.google.com/drive/folders/…" autoComplete="off" />
      </div>
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="flex items-center gap-2 text-sm text-nf-success">
          <CheckCircle2 size={16} aria-hidden /> {state.ok}
        </p>
      )}
      <SubmitButton size="sm" pendingLabel="Verificando a pasta...">Ligar pasta</SubmitButton>
    </form>
  );
}
