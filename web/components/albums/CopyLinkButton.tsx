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
      // Sem permissão de clipboard (ex.: contexto não seguro) — falha silenciosa.
    }
  }

  return (
    <Button
      variant="secondary"
      icon={copied ? <Check size={16} /> : <Copy size={16} />}
      onClick={handleCopy}
    >
      {copied ? "Link copiado!" : "Copiar link"}
    </Button>
  );
}
