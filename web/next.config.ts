import type { NextConfig } from "next";

/**
 * Redirecionamentos das rotas antigas (v0.1 e Fase 1) para o NossaFoto Admin,
 * para que links salvos continuem levando a um lugar útil.
 */
const nextConfig: NextConfig = {
  async redirects() {
    const to = (source: string, destination: string) => ({ source, destination, permanent: false });
    return [
      to("/dashboard", "/painel"),
      to("/albums/:path*", "/acervos"),
      to("/storage", "/assinatura"),
      to("/integrations", "/integracoes"),
      to("/settings", "/configuracoes"),
      to("/buscar/:path*", "/acervos"),
      to("/acervo/:path*", "/acervos"),
      to("/fontes", "/integracoes"),
      to("/conta", "/configuracoes"),
      to("/conta/assinatura", "/assinatura"),
      to("/conta/consumo", "/assinatura"),
      to("/conta/privacidade", "/configuracoes"),
    ];
  },
};

export default nextConfig;
