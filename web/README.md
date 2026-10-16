# NossaFoto — Web

App NossaFoto: acervo pessoal de fotos com busca por rosto, além da página pública de um álbum compartilhado. Next.js 16 (App Router) + TypeScript + Tailwind v4. Publicado na Vercel a partir da branch `main` (Root Directory `web`). A interface ainda segue o direcionamento pessoal da Fase 1; a adaptação para NossaFoto Admin e NossaFoto Search está no [roadmap](../docs/roadmap.md).

## Rodando localmente

```sh
npm install
npm run dev
```

Abre em `http://localhost:3000`.

## Estrutura

```
app/(app)/                      Área logada, dentro do AppShell (sidebar no desktop, barra inferior no mobile)
  page.tsx                      Início
  buscar/{rosto,descricao,filtros}
  acervo/                       Todas as fotos, álbuns, importações, importar
  fontes/                       Upload direto, dispositivo, Google Drive
  conta/                        Perfil, assinatura, consumo, privacidade
app/(public)/[handle]/[album]/  Página pública de um álbum compartilhado (busca por selfie)
components/ui/                  Design system: Button, Card, Badge, Input, Field, ProgressBar, EmptyState, SectionTabs...
components/brand/               Logo
components/layout/              AppShell, Sidebar, MobileNav, MobileTopbar, nav-items
components/photos/              PhotoGrid, PhotoLightbox, AlbumCard
components/search/              SearchBar, FaceSearch, DescriptionSearch
components/import/              ImportFlow, UploadFileList
components/albums/              Ajustes, compartilhamento
lib/types.ts                    Tipos do domínio (espelham ../docs/data-model.md)
lib/mock-data.ts                Dados de demonstração em memória (uma conta, oito álbuns)
lib/api/                        Leituras (hoje sobre o mock, no formato de ../docs/api-routes.md)
lib/actions/                    Mutações e buscas como Server Actions
```

Componentes de cliente nunca importam `lib/mock-data.ts`: leem por `lib/api/*` (no servidor) e escrevem por `lib/actions/*`. Trocar o mock pelo banco real não exige mudar a interface.

As rotas antigas (`/dashboard`, `/albums`, `/storage`, `/integrations`, `/settings`) redirecionam para as novas em `next.config.ts`.

## O que é real e o que é demonstração

**Real:**
- Todas as telas e fluxos funcionam de ponta a ponta. Importar, publicar e ajustar um álbum altera o estado do servidor e aparece nas outras telas (`revalidatePath`).
- A importação valida os arquivos de verdade: aceita apenas imagens e recusa arquivos acima de 50 MB.
- O QR Code e o link do álbum compartilhado são gerados de verdade (`qrcode`).

**Demonstração:**
- Não há banco: o estado fica em memória e é reiniciado a cada deploy.
- Os arquivos importados não são guardados; o álbum registra apenas a quantidade recebida.
- A busca por rosto não processa a imagem, que nem sai do navegador. Ela devolve um exemplo do acervo, marcado como "Demonstração" na tela.
- Não há autenticação: a conta é fixa (`mockAccount`).

**Ainda não implementado (a interface diz isso claramente):** busca por descrição, Google Drive, assinaturas.
