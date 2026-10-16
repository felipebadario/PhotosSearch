import type { ReactNode } from "react";

/** "Procurando suas fotos...": anéis suaves em volta da foto de referência. */
export function SearchingIndicator({
  title = "Procurando suas fotos...",
  description = "Isso leva só alguns segundos.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center py-12 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-nf-pulse-ring rounded-full bg-nf-accent/25" />
        <span
          className="absolute inset-0 animate-nf-pulse-ring rounded-full bg-nf-accent/20"
          style={{ animationDelay: "0.6s" }}
        />
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-nf-surface bg-nf-accent-soft shadow-nf-float">
          {children}
        </div>
      </div>
      <p className="mt-8 text-lg font-semibold text-nf-text">{title}</p>
      <p className="mt-1 text-sm text-nf-muted">{description}</p>
    </div>
  );
}
