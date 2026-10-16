import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-nf-lg border border-dashed border-nf-line-strong bg-nf-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-nf-sunken text-nf-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-nf-text">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-nf-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
