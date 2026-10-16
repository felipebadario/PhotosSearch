import { FolderOpen, Home, Search, UserRound, UploadCloud } from "lucide-react";

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto para a barra inferior do celular. */
  shortLabel: string;
  icon: typeof Home;
  /** Prefixo de rota que marca o item como ativo. */
  match: string;
  children?: NavChild[];
}

export const navItems: NavItem[] = [
  { href: "/", label: "Início", shortLabel: "Início", icon: Home, match: "/" },
  {
    href: "/buscar/rosto",
    label: "Buscar",
    shortLabel: "Buscar",
    icon: Search,
    match: "/buscar",
    children: [
      { href: "/buscar/rosto", label: "Por rosto" },
      { href: "/buscar/descricao", label: "Por descrição" },
      { href: "/buscar/filtros", label: "Filtros" },
    ],
  },
  {
    href: "/acervo",
    label: "Meu Acervo",
    shortLabel: "Acervo",
    icon: FolderOpen,
    match: "/acervo",
    children: [
      { href: "/acervo", label: "Todas as fotos" },
      { href: "/acervo/albuns", label: "Álbuns" },
      { href: "/acervo/importacoes", label: "Importações" },
    ],
  },
  {
    href: "/fontes",
    label: "Fontes",
    shortLabel: "Fontes",
    icon: UploadCloud,
    match: "/fontes",
    children: [
      { href: "/fontes#upload", label: "Upload direto" },
      { href: "/fontes#google-drive", label: "Google Drive" },
      { href: "/fontes#dispositivo", label: "Dispositivo" },
    ],
  },
  {
    href: "/conta",
    label: "Minha Conta",
    shortLabel: "Conta",
    icon: UserRound,
    match: "/conta",
    children: [
      { href: "/conta", label: "Perfil" },
      { href: "/conta/assinatura", label: "Assinatura" },
      { href: "/conta/consumo", label: "Consumo" },
      { href: "/conta/privacidade", label: "Privacidade" },
    ],
  },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);
}
