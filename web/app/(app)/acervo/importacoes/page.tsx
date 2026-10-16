import type { Metadata } from "next";
import Link from "next/link";
import { Cloud, History, Smartphone, UploadCloud } from "lucide-react";
import { listImports } from "@/lib/api/imports";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { importStatusLabel, sourceLabel } from "@/lib/labels";
import { formatShortDate, plural } from "@/lib/format";
import type { ImportStatus, PhotoSource } from "@/lib/types";

export const metadata: Metadata = { title: "Importações" };

const sourceIcon: Record<PhotoSource, typeof Cloud> = {
  upload: UploadCloud,
  device: Smartphone,
  google_drive: Cloud,
};

const statusTone: Record<ImportStatus, "neutral" | "accent" | "success" | "danger"> = {
  uploading: "accent",
  preparing: "accent",
  done: "success",
  error: "danger",
};

export default async function ImportsPage() {
  const imports = await listImports();

  if (imports.length === 0) {
    return (
      <EmptyState
        icon={<History size={22} aria-hidden />}
        title="Nenhuma importação ainda"
        description="Cada vez que você trouxer fotos para o acervo, o andamento aparece aqui."
        action={<Button href="/acervo/importar">Importar fotos</Button>}
      />
    );
  }

  return (
    <ul className="divide-y divide-nf-line rounded-nf-lg border border-nf-line bg-nf-surface">
      {imports.map((imp) => {
        const Icon = sourceIcon[imp.source];
        const inProgress = imp.status === "uploading" || imp.status === "preparing";
        return (
          <li key={imp.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nf-sunken text-nf-text">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-nf-text">
                {imp.albumId && imp.albumName ? (
                  <Link href={`/acervo/albuns/${imp.albumId}`} className="hover:underline">
                    {imp.albumName}
                  </Link>
                ) : (
                  "Acervo (sem álbum)"
                )}
              </p>
              <p className="truncate text-[13px] text-nf-muted">
                {sourceLabel(imp.source)} · {formatShortDate(imp.createdAt)} ·{" "}
                {plural(imp.totalFiles, "arquivo", "arquivos")}
                {imp.failedFiles > 0 && ` · ${plural(imp.failedFiles, "com erro", "com erro")}`}
              </p>
            </div>
            <Badge tone={statusTone[imp.status]} dot pulse={inProgress} className="shrink-0">
              {importStatusLabel(imp.status)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
