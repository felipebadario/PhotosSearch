"use client";

import { useState } from "react";
import { Briefcase, Camera, Check, Church, GraduationCap, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";

const audiences = [
  {
    id: "igrejas",
    label: "Igrejas",
    icon: Church,
    title: "Todo culto, batismo e retiro num acervo que a comunidade consegue usar.",
    bullets: [
      "Um acervo permanente para o dia a dia e um evento para cada data especial.",
      "Voluntários da equipe de mídia enviam as fotos, cada um com seu acesso.",
      "Os membros se encontram pelo QR Code no telão, sem criar conta.",
    ],
    setup: "Acervo permanente + eventos",
  },
  {
    id: "escolas",
    label: "Escolas",
    icon: GraduationCap,
    title: "Famílias encontram os filhos nas fotos da formatura, da feira e da festa junina.",
    bullets: [
      "Eventos com prazo: a página abre na data e encerra sozinha.",
      "Página fora dos buscadores. Só chega quem recebe o link ou o QR Code.",
      "Nada de pasta gigante no grupo da turma.",
    ],
    setup: "Um evento por ocasião",
  },
  {
    id: "eventos",
    label: "Eventos",
    icon: Ticket,
    title: "Congressos, corridas e casamentos entregam a foto certa para cada participante.",
    bullets: [
      "Fotos chegando do Google Drive durante o evento, sem parar a cobertura.",
      "Participantes acham as próprias fotos no mesmo dia.",
      "Pagamento por evento, sem assinatura.",
    ],
    setup: "NossaFoto Events",
  },
  {
    id: "fotografos",
    label: "Fotógrafos",
    icon: Camera,
    title: "Entregue milhares de fotos de um jeito que o cliente lembra de você.",
    bullets: [
      "Ligue a pasta do Drive que você já usa e a galeria se monta sozinha.",
      "Cada subpasta vira um álbum: cerimônia, festa, making of.",
      "Os convidados se encontram com uma selfie e você para de receber pedidos no WhatsApp.",
    ],
    setup: "Um evento por cliente",
  },
  {
    id: "empresas",
    label: "Empresas",
    icon: Briefcase,
    title: "Convenções, treinamentos e endomarketing com um banco de fotos que se organiza.",
    bullets: [
      "Equipe de comunicação com papéis: quem administra e quem só envia.",
      "Acervo permanente da marca, com eventos internos ao lado.",
      "Colaboradores encontram as próprias fotos sem precisar pedir.",
    ],
    setup: "Assinatura Business",
  },
];

export function Audiences() {
  const [active, setActive] = useState(audiences[0].id);
  const a = audiences.find((x) => x.id === active) ?? audiences[0];
  return (
    <div>
      <div role="tablist" aria-label="Para quem é" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {audiences.map((x) => {
          const Icon = x.icon;
          const on = x.id === active;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="publico-painel"
              id={`publico-${x.id}`}
              onClick={() => setActive(x.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                on ? "border-nf-ink bg-nf-ink text-white" : "border-nf-line bg-nf-surface text-nf-text hover:border-nf-line-strong",
              )}
            >
              <Icon size={16} aria-hidden /> {x.label}
            </button>
          );
        })}
      </div>

      <div id="publico-painel" role="tabpanel" aria-labelledby={`publico-${a.id}`} className="mt-6 rounded-nf-xl border border-nf-line bg-nf-surface p-6 sm:p-10">
        <div key={a.id} className="grid animate-nf-rise gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-medium text-nf-muted">{a.label}</p>
            <h3 className="mt-2 text-2xl font-semibold leading-snug text-nf-text sm:text-[28px] sm:leading-tight">{a.title}</h3>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-nf-sunken px-3 py-1.5 text-xs font-medium text-nf-muted">
              Formato sugerido: <span className="text-nf-text">{a.setup}</span>
            </p>
          </div>
          <ul className="space-y-4">
            {a.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-[15px] text-nf-text">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nf-success-soft text-nf-success">
                  <Check size={13} strokeWidth={2.5} aria-hidden />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
