# Arquitetura — Descomplica Fotos

## Camadas

```
Descomplica Fotos (SaaS)          web/
        ↓
Face Search Service (domínio)     face-search-service/  (API interna, hoje ainda um app standalone)
        ↓
Engine de reconhecimento facial   InsightFace (buffalo_sc), dentro de face-search-service/app/face_service.py
```

O produto nunca é estruturado *ao redor* da engine facial — a engine é um serviço interno que o SaaS chama para uma operação específica (indexar fotos de um álbum, comparar uma selfie contra os rostos daquele álbum). O restante do produto (organizações, planos, álbuns, fotos, métricas, páginas públicas) é meta-dados relacionais comuns a qualquer SaaS multi-tenant e não depende de nada específico de visão computacional.

Em v0.1, essa separação existe na estrutura do repositório e na documentação, mas a integração em runtime entre `web/` e `face-search-service/` **ainda não está implementada** — ver "O que é real vs. mockado" no README raiz. O `face-search-service/` continua funcionando exatamente como o MVP original (standalone, um índice por deploy, `gdown`→API do Drive já corrigido), e seguirá publicado como está em `https://encontre-suas-fotos.onrender.com` até a v0.2 conectar o SaaS a ele de verdade.

## Modelo organizacional

```
User
  ↓ (member of)
Organization
  ↓
Subscription → Product  (ex.: "Descomplica Fotos", "Descomplica Church")
  ↓
Album
  ├── Photo
  ├── Face          (embedding vetorial, sempre com album_id)
  ├── ProcessingJob (ingestão, thumbnail, detecção de rosto)
  └── página pública (slug do álbum sob o slug da organização)
```

Uma `Organization` é o tenant. Um `User` pertence a uma ou mais organizações (via `OrganizationMembership`, com papel). Produtos (`Product`) são contratáveis por organização via `Subscription` — isso já modela os dois cenários do negócio (cliente independente do Fotos vs. cliente Church que ativa Fotos como add-on) sem exigir nenhuma mudança de esquema quando o ecossistema Descomplica for integrado de verdade: basta a mesma `Organization` ganhar uma segunda `Subscription` para outro `Product`.

Ver `data-model.md` para o schema completo.

## Isolamento multi-tenant

- Toda tabela com dado de um tenant carrega `organization_id` — inclusive tabelas "filhas" como `Photo` e `Face`, mesmo já existindo `album_id` (redundância deliberada: facilita políticas de isolamento e índices sem sempre fazer join até `Album`).
- Busca facial **nunca** compara entre álbuns ou organizações diferentes. Toda consulta de similaridade é filtrada por `album_id` (e por transitividade, `organization_id`) — nunca existe uma "identidade facial global" do usuário nem índice compartilhado entre eventos/igrejas.
- A refatoração planejada da engine (v0.2) recebe explicitamente `organization_id` e `album_id` como parâmetros obrigatórios de qualquer função de busca/indexação — não como um efeito colateral de qual arquivo pickle está carregado (que é como o MVP standalone funciona hoje, com um índice global por deploy).

## Privacidade da selfie

Princípio mantido do MVP: a selfie enviada para busca nunca é persistida.

```
selfie (upload) → embedding (em memória) → comparação com Face.embedding do álbum → descarte
```

Isso já é verdade no `face-search-service/app/main.py` (a selfie e o buffer de upload nunca tocam disco) e deve continuar valendo quando o worker de produção existir: o job de busca recebe a selfie, calcula o embedding, compara, responde, e não grava a imagem nem o vetor da selfie em lugar nenhum.

## Infraestrutura alvo (v0.2+, não implementada em v0.1)

```
Frontend (Next.js, web/)
   ↓
API (rotas do próprio Next.js em v0.1; pode virar serviço dedicado depois se necessário)
   ↓
PostgreSQL (+ pgvector para Face.embedding)
   ↓
Object Storage (fotos originais + thumbnails — S3-compatível: S3, R2 ou GCS)
   ↓
Queue (jobs de ingestão/processamento — ver nota abaixo)
   ↓
Worker de processamento facial (chama face-search-service internamente)
```

- **Banco vetorial:** `pgvector` como extensão do próprio Postgres, não um banco vetorial separado — evita infraestrutura extra numa fase em que o volume por tenant é pequeno (uma igreja, um álbum por vez). Índice `ivfflat` ou `hnsw` sobre `Face.embedding` quando o volume justificar.
- **Fila:** um worker simples consumindo uma tabela de jobs no próprio Postgres (padrão "fila em SQL", ex.: `pg-boss` ou implementação equivalente) é suficiente para v0.1/v0.2 e evita adicionar Redis/RabbitMQ antes de precisar. Migrar para uma fila dedicada é um corte limpo depois, sem mudar o modelo de dados (`ProcessingJob` já é a fila).
- **Sem microserviços novos:** o "Face Search Service" é uma fronteira de *código* (pacote/módulo com interface clara), não necessariamente um serviço de rede separado. Ele já É um processo HTTP separado hoje (herdado do MVP), mas o objetivo de v0.2 é ele virar uma biblioteca interna chamada pelo worker, ou — se permanecer um processo HTTP por simplicidade operacional — ser chamado apenas pelo worker, nunca diretamente pelo browser.

## Design system

Extraído da folha de estilos de produção do `descomplica.church` (via inspeção do CSS servido, não cópia de layout):

| Token | Valor | Uso |
|---|---|---|
| `--df-primary` | `#153d33` (verde-escuro) | Herdado do Church — ação principal, texto de destaque |
| `--df-ink` | `#19342d` | Texto |
| `--df-cream` | `#f7f5ef` | Fundo de página |
| `--df-line` | `#dcd9d0` | Bordas/divisores |
| `--df-accent` (novo, próprio do Fotos) | `#d98a3d` (âmbar/dourado) | Destaques do Fotos — evoca luz/flash/revelação, distinto do laranja-coral do Church |
| Tipografia | `Manrope` (texto/UI), `DM Sans` (títulos maiores) | Mesma família tipográfica do Church |
| Raio de borda | 8–16px em cards/inputs, pills (999px) em badges/status | — |
| Sombra | Sombras coloridas e difusas (`0 20px 55px rgba(21,61,51,.06)`), nunca cinza puro | — |

Ver `web/tailwind.config.ts` para os tokens aplicados.
