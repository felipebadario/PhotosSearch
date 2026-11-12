import { CreditCard, FolderOpen, LayoutDashboard, Plug, Settings } from "lucide-react";

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto para a barra inferior do celular. */
  shortLabel: string;
  icon: typeof LayoutDashboard;
  /** Prefixo de rota que marca o item como ativo. */
  match: string;
  children?: NavChild[];
}

export const navItems: NavItem[] = [
  { href: "/painel", label: "Painel", shortLabel: "Painel", icon: LayoutDashboard, match: "/painel" },
  { href: "/acervos", label: "Acervos e eventos", shortLabel: "Acervos", icon: FolderOpen, match: "/acervos" },
  { href: "/integracoes", label: "Integrações", shortLabel: "Fontes", icon: Plug, match: "/integracoes" },
  { href: "/assinatura", label: "Assinatura", shortLabel: "Plano", icon: CreditCard, match: "/assinatura" },
  {
    href: "/configuracoes",
    label: "Configurações",
    shortLabel: "Ajustes",
    icon: Settings,
    match: "/configuracoes",
    children: [
      { href: "/configuracoes", label: "Organização" },
      { href: "/configuracoes/membros", label: "Membros" },
    ],
  },
];

export function isActive(item: NavItem, pathname: string) {
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
