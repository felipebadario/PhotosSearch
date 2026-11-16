"use client";

import { useTransition, type ReactNode } from "react";
import { managerSignOutAction } from "@/lib/actions/manager";

/** Sai e recarrega no login do manager (sem redirect no servidor, por causa do subdomínio). */
export function ManagerSignOut({ to, className, children, label }: { to: string; className?: string; children: ReactNode; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      className={className}
      onClick={() => start(async () => {
        await managerSignOutAction();
        window.location.assign(to);
      })}
    >
      {children}
    </button>
  );
}
