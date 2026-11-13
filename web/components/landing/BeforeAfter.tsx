"use client";

import { useState } from "react";
import { FolderOpen, MessageCircle, Search, ScanFace, QrCode, Download, Hourglass } from "lucide-react";
import { cn } from "@/lib/cn";

const without = [
  { icon: FolderOpen, title: "Uma pasta com 1.284 fotos", text: "O link vai para o grupo e cada pessoa precisa abrir foto por foto." },
  { icon: Hourglass, title: "Rolar, rolar, rolar", text: "Depois de alguns minutos, a maioria desiste antes de se achar." },
  { icon: MessageCircle, title: "Pedidos no privado", text: "“Tem alguma foto minha?” Alguém da equipe para tudo para procurar." },
];

const withNf = [
  { icon: QrCode, title: "Um QR Code no telão", text: "A página abre no celular, sem baixar app e sem criar conta." },
  { icon: ScanFace, title: "Uma selfie", text: "A busca compara o rosto com todas as fotos do acervo de uma vez." },
  { icon: Download, title: "Só as fotos da pessoa", text: "Em segundos ela vê onde aparece e guarda as que quiser." },
];

export function BeforeAfter() {
  const [on, setOn] = useState(true);
  const items = on ? withNf : without;
  return (
    <div className="rounded-nf-xl border border-nf-line bg-nf-surface p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold text-nf-text">Depois do evento, como as pessoas acham as fotos?</p>
        <div role="radiogroup" aria-label="Comparar" className="inline-flex shrink-0 rounded-full bg-nf-sunken p-1">
          {[
            { v: false, label: "Do jeito de sempre" },
            { v: true, label: "Com NossaFoto" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={on === o.v}
              onClick={() => setOn(o.v)}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium transition-colors",
                on === o.v ? (o.v ? "bg-nf-accent text-white" : "bg-nf-surface text-nf-text shadow-sm") : "text-nf-muted hover:text-nf-text",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <ol key={String(on)} className="mt-6 grid gap-3 sm:grid-cols-3">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li
              key={it.title}
              className={cn("animate-nf-rise rounded-nf-lg border p-5", on ? "border-nf-accent/25 bg-nf-accent-soft/40" : "border-nf-line bg-nf-canvas")}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", on ? "bg-nf-accent text-white" : "bg-nf-sunken text-nf-muted")}>
                <Icon size={18} aria-hidden />
              </span>
              <p className="mt-4 font-semibold text-nf-text">{it.title}</p>
              <p className="mt-1 text-sm text-nf-muted">{it.text}</p>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 flex items-center gap-2 text-sm text-nf-muted">
        <Search size={15} aria-hidden />
        {on ? "Para quem organiza, é o mesmo trabalho de sempre: subir as fotos." : "Troque para “Com NossaFoto” e veja a diferença."}
      </p>
    </div>
  );
}
