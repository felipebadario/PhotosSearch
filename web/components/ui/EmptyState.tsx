import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-df-line px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-df-mint-soft text-df-primary">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-df-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-df-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
