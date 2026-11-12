# NossaFoto — Web

NossaFoto Admin (painel das organizações) e, nas próximas etapas, NossaFoto Search (página do participante). Next.js 16 (App Router) + TypeScript + Tailwind v4, Postgres com Drizzle e autenticação com Better Auth. Publicado na Vercel a partir da `main` (Root Directory `web`).

## Rodando localmente

Precisa de um Postgres 16 acessível.

```sh
cp .env.example .env.local   # ajuste DATABASE_URL e BETTER_AUTH_SECRET
npm install
npm run db:migrate
npm run dev
```

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `DATABASE_URL` | Vercel (criada pela integração com o Neon) e `.env.local` | Banco Postgres |
| `BETTER_AUTH_SECRET` | Vercel (Production e Preview) e `.env.local` | Assina as sessões. Texto aleatório longo, diferente por ambiente |
| `BETTER_AUTH_URL` | Opcional | URL pública. Sem ela, usa o domínio do deploy da Vercel |

Nenhum valor real vai para o repositório.

## Scripts

- `npm run build`: aplica as migrações pendentes (se houver `DATABASE_URL`) e gera o build.
- `npm run db:generate`: cria uma migração em `drizzle/` a partir de `lib/server/db/schema`.
- `npm run db:migrate`: aplica as migrações.
- `npm test`: testes de isolamento entre organizações (precisa de `DATABASE_URL`).

## Estrutura

```
app/page.tsx                    Página inicial (visitantes); quem está logado vai para o painel
app/(auth)/                     Entrar, criar conta, criar organização, aceitar convite
app/(app)/                      NossaFoto Admin: painel, acervos, integrações, assinatura, configurações
app/api/auth/[...all]/          Rotas do Better Auth
app/(public)/[handle]/[album]/  Prévia da página do participante, ainda com dados de demonstração
lib/server/db/                  Cliente e schema (Drizzle). Migrações em drizzle/
lib/server/auth.ts              Better Auth com o plugin de organizações
lib/server/permissions.ts       Papéis: dono, administrador e editor
lib/server/session.ts           requireAdmin(): sessão + organização ativa + papel
lib/server/repos/               Acesso a dados; toda função exige o contexto da organização
lib/actions/                    Server Actions das telas
tests/                          Testes com node:test
```

Toda leitura ou escrita de dados de cliente passa por `lib/server/repos`, que recebe o contexto da organização e sempre filtra por ela. O papel vem da tabela de membros, nunca do navegador.

## O que ainda é demonstração

A página pública `/{handle}/{album}` e os componentes de busca e importação herdados da Fase 1 usam `lib/mock-data.ts`. Eles serão ligados ao banco nas etapas P0.2 a P0.4 (ver `../docs/roadmap.md`).
