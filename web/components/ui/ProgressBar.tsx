import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  tone = "ink",
  label,
  className,
}: {
  value: number;
  tone?: "ink" | "accent";
  /** Descrição para leitores de tela, ex.: "Enviando suas fotos". */
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-nf-sunken", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          tone === "accent" ? "bg-nf-accent" : "bg-nf-ink",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
