import { cn } from "@/lib/cn";
import type { AlbumStatus } from "@/lib/types";

const statusStyles: Record<AlbumStatus, string> = {
  published: "bg-df-mint-soft text-df-primary-dark",
  processing: "bg-df-accent-soft text-df-accent-dark",
  draft: "bg-df-line/60 text-df-muted",
  error: "bg-df-danger-soft text-df-danger",
};

const statusLabels: Record<AlbumStatus, string> = {
  published: "Publicado",
  processing: "Processando",
  draft: "Rascunho",
  error: "Erro",
};

export function StatusBadge({ status }: { status: AlbumStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "published" && "bg-df-primary",
          status === "processing" && "bg-df-accent animate-pulse",
          status === "draft" && "bg-df-muted",
          status === "error" && "bg-df-danger",
        )}
      />
      {statusLabels[status]}
    </span>
  );
}
