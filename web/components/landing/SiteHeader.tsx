"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const links = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#para-quem", label: "Para quem é" },
  { href: "#recursos", label: "Recursos" },
  { href: "#privacidade", label: "Privacidade" },
  { href: "#planos", label: "Planos" },
  { href: "#perguntas", label: "Perguntas" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled || open ? "border-nf-line bg-nf-canvas/90 backdrop-blur" : "border-transparent bg-nf-canvas",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="NossaFoto, início" className="rounded-nf">
          <Logo size={28} />
        </Link>
        <nav aria-label="Seções" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-nf px-3 py-2 text-sm text-nf-muted transition-colors hover:bg-nf-sunken hover:text-nf-text">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block"><Button href="/entrar" variant="ghost" size="sm">Entrar</Button></span>
          <Button href="/criar-conta" size="sm">Criar conta</Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-secoes"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="flex h-11 w-11 items-center justify-center rounded-nf text-nf-text hover:bg-nf-sunken lg:hidden"
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-secoes" aria-label="Seções" className="animate-nf-fade-in border-t border-nf-line px-4 pb-4 pt-2 lg:hidden">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="flex h-12 items-center rounded-nf px-3 text-[15px] text-nf-text hover:bg-nf-sunken">
                  {l.label}
                </a>
              </li>
            ))}
            <li className="sm:hidden">
              <Link href="/entrar" className="flex h-12 items-center rounded-nf px-3 text-[15px] font-medium text-nf-text hover:bg-nf-sunken">Entrar</Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
