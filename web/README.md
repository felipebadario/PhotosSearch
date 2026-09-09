# Descomplica Fotos — Web (v0.1)

SaaS: dashboard admin da igreja + página pública de busca por selfie. Next.js (App Router) + TypeScript + Tailwind v4.

## Rodando localmente

```sh
npm install
npm run dev
```

Abre em `http://localhost:3000`, redireciona para `/dashboard`.

## Estrutura

```
app/(admin)/        Dashboard, Álbuns, Armazenamento, Integrações, Configurações — atrás do AdminShell (sidebar).
app/(public)/[org]/[album]/   Página pública de busca por selfie — sem sidebar, mobile-first.
components/ui/       Design system: Button, Card, Badge, Input, StatCard, ProgressBar, EmptyState, OrgMark.
components/layout/   AdminShell, Sidebar, MobileNav (bottom tab bar no mobile), MobileTopbar.
components/albums/   Wizard de criação de álbum, abas do álbum, lista de upload, QR/link de compartilhamento.
components/public/   Fluxo de busca por selfie (SelfieSearch) e o lightbox de foto.
lib/types.ts         Tipos do domínio (espelham docs/data-model.md na raiz do repo).
lib/mock-data.ts     Dados mockados (uma organização, quatro álbuns em status diferentes).
lib/api/             Leituras — hoje batem no mock, formato já é o contrato de docs/api-routes.md.
lib/actions/         Mutações como Server Actions do Next.js (create/upload/publish/update de álbum).
```

## O que é real vs. mockado

**Real:**
- Todas as telas e fluxos são navegáveis de ponta a ponta, sem nenhum dado "preso" — criar álbum, enviar fotos, publicar, ver compartilhamento (QR Code real, gerado por `qrcode`), tudo funciona.
- As mutações (`lib/actions/albums.ts`) são Server Actions de verdade: escrevem no estado do servidor (`lib/mock-data.ts`) e usam `revalidatePath`, então navegar para `/albums` ou `/dashboard` depois de criar um álbum mostra o resultado — não é só uma ilusão local do componente que criou.
- Design system com tokens extraídos da folha de estilo de produção do `descomplica.church` (ver `../docs/architecture.md`).

**Mockado (o contrato que substitui isso está em `../docs/api-routes.md` e `../docs/data-model.md`):**
- Não existe banco de dados — `lib/mock-data.ts` é um array em memória, reiniciado a cada `npm run dev`/deploy.
- Upload de fotos não envia bytes de verdade; a barra de progresso do wizard é uma animação no client (ver comentário em `lib/actions/albums.ts`). Se a aba for fechada no meio do envio, o álbum fica com status "Processando" indefinidamente neste mock — não há worker de verdade para retomar.
- "Rostos identificados" é um número calculado (`fotos × 4.2`), não uma detecção real. A engine de verdade já existe e funciona — ver `../face-search-service/` — só não está conectada ao SaaS ainda.
- A busca pública por selfie não processa nenhuma imagem: devolve um subconjunto determinístico das fotos do álbum, com uma similaridade aleatória só para ordenar o resultado.
- Importação do Google Drive é só a interface (`drive-soon` no wizard, card "Não conectado" em Integrações) — sem OAuth implementado.
- Não há autenticação: a organização é fixa (`mockOrganization`).

## Próximos passos (v0.2)

Ver a seção "Próximos passos" no README raiz do repositório.
