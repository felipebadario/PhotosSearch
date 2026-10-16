"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { publishAlbumAction, unpublishAlbumAction } from "@/lib/actions/albums";

export function ShareToggle({ albumId, isPublic }: { albumId: string; isPublic: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      if (isPublic) await unpublishAlbumAction(albumId);
      else await publishAlbumAction(albumId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return isPublic ? (
    <Button variant="danger" onClick={toggle} disabled={pending}>
      {pending ? "Desativando..." : "Parar de compartilhar"}
    </Button>
  ) : (
    <Button onClick={toggle} disabled={pending}>
      {pending ? "Criando link..." : "Criar link de compartilhamento"}
    </Button>
  );
}
