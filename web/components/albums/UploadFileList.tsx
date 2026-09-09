import { AlertCircle, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface UploadItem {
  id: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

export function UploadFileList({ items }: { items: UploadItem[] }) {
  return (
    <ul className="max-h-64 divide-y divide-df-line overflow-y-auto rounded-xl border border-df-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <ImageIcon size={16} className="shrink-0 text-df-muted" />
          <span className="min-w-0 flex-1 truncate text-df-ink">{item.name}</span>
          {item.status === "pending" && (
            <span className="text-xs text-df-muted">Na fila</span>
          )}
          {item.status === "uploading" && (
            <Loader2 size={16} className="shrink-0 animate-spin text-df-accent" />
          )}
          {item.status === "done" && (
            <CheckCircle2 size={16} className="shrink-0 text-df-primary" />
          )}
          {item.status === "error" && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 text-xs font-medium text-df-danger",
              )}
              title={item.errorMessage}
            >
              <AlertCircle size={15} />
              Falhou
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
