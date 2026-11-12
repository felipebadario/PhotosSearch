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
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Vercel (Production e Preview) | Bucket privado do Cloudflare R2 com os originais. Sem elas, a Vercel mostra o envio como "não ativo" e o desenvolvimento local grava em `./.storage` |
| `STORAGE_DRIVER=local`, `LOCAL_STORAGE_DIR` | Só local | Força o disco local mesmo com `next start` (testes de ponta a ponta) |

Nenhum valor real vai para o repositório.

### CORS do bucket R2

O navegador envia as fotos direto para o R2, então o bucket precisa desta regra de CORS (Cloudflare → R2 → bucket → Settings → CORS policy):

```json
[{ "AllowedOrigins": ["https://nossafoto.app", "https://www.nossafoto.app", "http://localhost:3000"],
   "AllowedMethods": ["PUT", "GET", "HEAD"],
   "AllowedHeaders": ["content-type", "x-amz-checksum-sha256"],
   "MaxAgeSeconds": 3600 }]
```

## Envio de fotos

1. O navegador calcula o SHA-256 de cada arquivo e chama `POST /api/uploads` em lotes de 100.
2. O servidor deduplica pelo hash dentro da organização, checa o limite do plano (com trava por organização) e devolve URLs de envio assinadas, presas ao tipo e ao hash do arquivo.
3. O navegador envia direto ao R2 e chama `POST /api/uploads/complete`; o servidor confere que o objeto existe com o tamanho esperado e coloca a foto no acervo, com status `queued` para a indexação da P0.3.

A franquia conta cada conteúdo distinto da organização uma vez, em qualquer acervo. Excluir uma foto de todos os acervos apaga o original e libera o espaço.

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

## Link público e QR Code

Cada acervo começa privado. No Admin, "Abrir por link" muda a visibilidade para `link` e mostra o endereço `/{organização}/{acervo}` e o QR Code. A página pública (`app/(public)/[handle]/[album]`) mostra a galeria do acervo, por álbum, sem login; as fotos saem por `GET /api/publico/{organização}/{acervo}/fotos/{id}`, que confere a cada pedido que o acervo está aberto e que a foto é dele. Evento que passou de "aberto até" mostra "encerrado" e não entrega fotos. A busca por selfie entra nesta mesma página depois da indexação (P0.3/P0.4).
