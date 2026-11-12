"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: o link continua visível para copiar à mão
    }
  }
  return (
    <Button variant="primary" size="sm" onClick={copy} icon={copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}>
      <span aria-live="polite">{copied ? "Link copiado" : "Copiar link"}</span>
    </Button>
  );
}
