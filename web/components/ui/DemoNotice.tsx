import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/** Aviso fixo de que esta é uma prévia com dados de exemplo. */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-nf bg-nf-sunken px-3.5 py-2.5 text-xs leading-relaxed text-nf-muted",
        className,
      )}
    >
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>
        Você está vendo uma prévia do NossaFoto. Os álbuns e fotos são exemplos, e nada do que
        você envia aqui é salvo.
      </span>
    </p>
  );
}
