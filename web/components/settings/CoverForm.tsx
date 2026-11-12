"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { updateCoverAction } from "@/lib/actions/covers";

export function CoverForm({ image, collectionId = null }: { image: string | null; collectionId?: string | null }) {
  const [state, action, pending] = useActionState(updateCoverAction.bind(null, collectionId), { message: "" });
  return (
    <section className="space-y-3 rounded-nf border border-nf-line bg-nf-surface p-5">
      <h2 className="font-semibold text-nf-text">{collectionId ? "Capa do evento" : "Capa da organização"}</h2>
      <p className="text-sm text-nf-muted">{collectionId
        ? "Aparece no topo da galeria pública deste evento."
        : "Aparece nas galerias públicas que não têm capa própria."}</p>
      {image && <Image unoptimized src={image} alt="Capa atual" width={1440} height={480} className="w-full rounded-nf" />}
      <form action={action} className="space-y-3">
        <label className="block text-sm">
          Escolher foto (JPG, PNG ou WebP, até 4 MB)
          <input
            type="file" name="image" accept="image/jpeg,image/png,image/webp" required
            className="mt-2 block w-full"
            onChange={(e) => {
              const input = e.currentTarget;
              input.setCustomValidity((input.files?.[0]?.size ?? 0) > 4 * 1024 * 1024 ? "Escolha uma imagem de até 4 MB." : "");
            }}
          />
        </label>
        <Button type="submit" size="sm" disabled={pending}>Salvar capa</Button>
      </form>
      {image && (
        <form action={action}>
          <input type="hidden" name="intent" value="remove" />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>Remover capa</Button>
        </form>
      )}
      <p role="status" className="text-sm">{pending ? "Salvando..." : state.message}</p>
    </section>
  );
}
