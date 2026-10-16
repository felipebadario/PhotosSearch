import type { NextConfig } from "next";

/**
 * Redirecionamentos das rotas da v0.1 para a navegação nova, para que links
 * antigos (favoritos, mensagens) continuem funcionando.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/albums", destination: "/acervo/albuns", permanent: false },
      { source: "/albums/new", destination: "/acervo/importar", permanent: false },
      { source: "/albums/:id", destination: "/acervo/albuns/:id", permanent: false },
      { source: "/albums/:id/fotos", destination: "/acervo/albuns/:id", permanent: false },
      { source: "/albums/:id/compartilhamento", destination: "/acervo/albuns/:id/compartilhar", permanent: false },
      { source: "/albums/:id/configuracoes", destination: "/acervo/albuns/:id/ajustes", permanent: false },
      { source: "/storage", destination: "/conta/consumo", permanent: false },
      { source: "/integrations", destination: "/fontes", permanent: false },
      { source: "/settings", destination: "/conta", permanent: false },
    ];
  },
};

export default nextConfig;
