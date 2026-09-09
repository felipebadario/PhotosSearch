import { GalleryVertical, HardDrive, LayoutDashboard, Plug, Settings } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/albums", label: "Álbuns", icon: GalleryVertical },
  { href: "/storage", label: "Armazenamento", icon: HardDrive },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/settings", label: "Configurações", icon: Settings },
] as const;
