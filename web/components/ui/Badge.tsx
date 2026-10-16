import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AlbumStatus } from "@/lib/types";
import { statusLabel } from "@/lib/labels";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-nf-sunken text-nf-muted",
  accent: "bg-nf-accent-soft text-nf-accent-ink",
  success: "bg-nf-success-soft text-nf-success",
  warning: "bg-nf-warning-soft text-nf-warning",
  danger: "bg-nf-danger-soft text-nf-danger",
};

export function Badge({
  tone = "neutral",
  dot,
  pulse,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
      )}
      {children}
    </span>
  );
}

const statusTone: Record<AlbumStatus, Tone> = {
  draft: "neutral",
  processing: "accent",
  ready: "success",
  published: "accent",
  error: "danger",
};

export function StatusBadge({ status, className }: { status: AlbumStatus; className?: string }) {
  return (
    <Badge
      tone={statusTone[status]}
      dot
      pulse={status === "processing"}
      className={className}
    >
      {statusLabel(status)}
    </Badge>
  );
}
