# Arquitetura — NossaFoto

## Camadas

```
NossaFoto (app)                   web/
        ↓
Face Search Service (domínio)     face-search-service/  (hoje ainda um app standalone)
        ↓
Engine de reconhecimento facial   InsightFace (buffalo_sc), em face-search-service/app/face_service.py
```

O produto não é construído ao redor da engine facial. A engine é um serviço interno que o app chama para operações específicas: indexar as fotos de um acervo e comparar uma foto de referência com os rostos desse acervo. O resto do produto (conta, assinatura, álbuns, fotos, importações, páginas públicas) é metadado relacional comum.

Na Fase 1 a integração em runtime entre `web/` e `face-search-service/` **ainda não existe**. O `face-search-service/` continua funcionando exatamente como o MVP original, publicado em `https://encontre-suas-fotos.onrender.com` a partir da branch `main`.

## Modelo de conta

```
User
  ↓ (dono de)
Account            (tenant; tem handle usado na URL pública)
  ├── Subscription → Plan
  ├── Photo        (acervo; pode estar ou não em um álbum)
  ├── Album
  │     └── página pública opcional: /{account.handle}/{album.slug}
  ├── ImportJob    (upload direto, dispositivo, Google Drive)
  ├── Face         (embedding vetorial, sempre com account_id)
  └── ProcessingJob
```

`Account` é o tenant. Na Fase 1 cada conta tem um único dono (`ownerUserId`); a tabela de vínculo permite convidar outras pessoas depois, sem mudar o schema. Ver `data-model.md`.

## Isolamento entre contas

- Toda tabela com dado de uma conta carrega `account_id`, inclusive tabelas filhas como `photos` e `faces`. A redundância é deliberada: facilita políticas de isolamento e índices sem join.
- A busca facial **nunca** cruza contas. Toda consulta de similaridade é filtrada por `account_id` e, quando a busca é dentro de um álbum ou na página pública, também por `album_id`. Não existe identidade facial global nem índice compartilhado.
- A refatoração da engine recebe `account_id` (e opcionalmente `album_id`) como parâmetros obrigatórios de qualquer busca ou indexação, em vez de depender de qual índice está carregado, como no MVP.

## Privacidade da foto de referência

Princípio mantido do MVP: a selfie ou foto enviada para busca nunca é persistida.

```
foto de referência → embedding (em memória) → comparação com faces da conta/álbum → descarte
```

Isso já vale em `face-search-service/app/main.py` e continua valendo no worker de produção.

## Infraestrutura alvo (a partir da Fase 2)

```
Vercel        Next.js (web/): interface + rotas de API + Server Actions
Neon          PostgreSQL + pgvector (dados e embeddings)
Cloudflare R2 Fotos originais e miniaturas (URLs assinadas)
Fly.io        Worker facial (consome a fila e chama a engine)
```

- **Banco vetorial:** `pgvector` no próprio Postgres, sem banco vetorial separado. Índice `hnsw` sobre `faces.embedding` quando o volume justificar.
- **Fila:** tabela `processing_jobs` no Postgres, consumida pelo worker. Uma fila dedicada pode vir depois sem mudar o modelo.
- **Sem microsserviços novos:** o Face Search Service é chamado só pelo worker e pela rota de busca, nunca direto pelo navegador.

## Design system

Definido em `web/app/globals.css` (tokens do Tailwind v4, prefixo `nf`):

| Token | Valor | Uso |
|---|---|---|
| `nf-canvas` | `#f7f7f5` | Fundo da página |
| `nf-surface` | `#ffffff` | Cards e painéis |
| `nf-ink` | `#16171a` | Texto forte e ação principal |
| `nf-muted` | `#5f636b` | Texto secundário |
| `nf-line` | `#e6e6e2` | Bordas e divisores |
| `nf-accent` | `#4f46e5` | Destaque pontual (busca, links ativos) |
| Tipografia | Geist | Texto e títulos |
| Raio | 8, 12, 16 e 24 px | Inputs, cards, painéis, fotos grandes |

Interface predominantemente clara, com as fotos como protagonistas: poucas cores, sem gradientes, sombras discretas.
