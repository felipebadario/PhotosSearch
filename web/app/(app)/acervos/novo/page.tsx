import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { createCollectionAction } from "@/lib/actions/collections";
import { can } from "@/lib/server/permissions";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Novo acervo ou evento" };

export default async function NovoAcervoPage({ searchParams }: PageProps<"/acervos/novo">) {
  const ctx = await requireAdmin();
  if (!can(ctx.role, { collection: ["create"] })) redirect("/acervos");
  const { tipo } = await searchParams;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/acervos" className="inline-flex items-center gap-1.5 text-sm text-nf-muted hover:text-nf-text">
          <ArrowLeft size={15} aria-hidden /> Acervos e eventos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-nf-text sm:text-[28px]">Novo acervo ou evento</h1>
      </div>
      <CollectionForm
        action={createCollectionAction}
        submitLabel="Criar"
        initial={{
          kind: tipo === "evento" ? "event" : "permanent",
          name: "",
          description: "",
          startsAt: "",
          endsAt: "",
          publicUntil: "",
          retentionDays: "",
          allowDownload: true,
        }}
      />
    </div>
  );
}
