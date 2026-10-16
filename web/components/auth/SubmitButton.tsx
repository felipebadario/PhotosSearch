"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  size = "md",
}: {
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={className}
      icon={pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : undefined}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
