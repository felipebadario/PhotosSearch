import type { Metadata } from "next";
import { FolderOpen, Plus } from "lucide-react";
import { CollectionBrowser } from "@/components/collections/CollectionBrowser";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { toCollectionCard } from "@/lib/collection-cards";
import { db } from "@/lib/server/db";
import { can } from "@/lib/server/permissions";
import { listCollections } from "@/lib/server/repos/collections";
import { getCollectionsOverview } from "@/lib/server/repos/photos";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Acervos e eventos" };

export default async function AcervosPage() {
  const ctx = await requireAdmin();
  const [items, overview] = await Promise.all([listCollections(db, ctx), getCollectionsOverview(db, ctx)]);
  const canCreate = can(ctx.role, { collection: ["create"] });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Acervos e eventos"
        description="Acervos permanentes guardam fotos ao longo do tempo. Eventos têm data para abrir e encerrar."
        actions={
          canCreate && (
            <Button href="/acervos/novo" icon={<Plus size={16} aria-hidden />}>
              Novo
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} aria-hidden />}
          title="Nenhum acervo ainda"
          description="Crie um acervo permanente para as fotos do dia a dia ou um evento para uma data específica."
          action={canCreate && <Button href="/acervos/novo">Criar o primeiro</Button>}
        />
      ) : (
        <CollectionBrowser items={items.map((c) => toCollectionCard(c, overview.get(c.id)))} />
      )}
    </div>
  );
}
