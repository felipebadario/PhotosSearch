import { AlertCircle, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";

export interface UploadItem {
  id: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

export function UploadFileList({ items }: { items: UploadItem[] }) {
  return (
    <ul
      aria-label="Arquivos da importação"
      className="max-h-72 divide-y divide-nf-line overflow-y-auto rounded-nf border border-nf-line"
    >
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <ImageIcon size={16} className="shrink-0 text-nf-subtle" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-nf-text">{item.name}</span>
            {item.status === "error" && item.errorMessage && (
              <span className="block text-xs text-nf-danger">{item.errorMessage}</span>
            )}
          </span>
          {item.status === "pending" && <span className="text-xs text-nf-subtle">Na fila</span>}
          {item.status === "uploading" && (
            <Loader2 size={16} className="shrink-0 animate-spin text-nf-accent" aria-label="Enviando" />
          )}
          {item.status === "done" && (
            <CheckCircle2 size={16} className="shrink-0 text-nf-success" aria-label="Enviada" />
          )}
          {item.status === "error" && (
            <AlertCircle size={16} className="shrink-0 text-nf-danger" aria-label="Falhou" />
          )}
        </li>
      ))}
    </ul>
  );
}
