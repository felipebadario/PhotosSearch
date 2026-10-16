"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sem permissão de área de transferência (ex.: contexto não seguro).
    }
  }

  return (
    <Button
      variant="secondary"
      icon={copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      onClick={handleCopy}
    >
      <span aria-live="polite">{copied ? "Link copiado" : "Copiar link"}</span>
    </Button>
  );
}
