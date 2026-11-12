"use client";

import { useActionState } from "react";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input, Label } from "@/components/ui/Input";
import { createAlbumAction, renameAlbumAction, type AlbumFormState } from "@/lib/actions/photos";

export function NewAlbumForm({ collectionId }: { collectionId: string }) {
  const [state, action] = useActionState<AlbumFormState, FormData>(createAlbumAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="collectionId" value={collectionId} />
      <div>
        <Label htmlFor="album-nome">Nome do álbum</Label>
        <Input id="album-nome" name="name" required maxLength={120} placeholder="Ex.: Formatura 2026" />
      </div>
      <FormError message={state.error} />
      <SubmitButton size="sm" pendingLabel="Criando...">Criar álbum</SubmitButton>
    </form>
  );
}

export function RenameAlbumForm({ collectionId, albumId, name }: { collectionId: string; albumId: string; name: string }) {
  const [state, action] = useActionState<AlbumFormState, FormData>(renameAlbumAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="albumId" value={albumId} />
      <div>
        <Label htmlFor="album-renomear">Nome do álbum</Label>
        <Input id="album-renomear" name="name" required maxLength={120} defaultValue={name} key={name} />
      </div>
      <FormError message={state.error} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Salvando...">Renomear</SubmitButton>
    </form>
  );
}
