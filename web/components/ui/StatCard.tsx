import type { ReactNode } from "react";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-df-muted">{label}</span>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-df-mint-soft text-df-primary">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-df-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-df-muted">{hint}</p>}
    </Card>
  );
}
