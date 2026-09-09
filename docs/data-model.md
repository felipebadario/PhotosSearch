# Modelo de dados — Descomplica Fotos

PostgreSQL + `pgvector`. Todas as tabelas de tenant carregam `organization_id`, mesmo quando alcançável por join, para tornar o isolamento entre tenants explícito em qualquer query e simplificar políticas de Row-Level Security no futuro.

Este schema ainda não está implementado em v0.1 (`web/lib/mock-data.ts` simula estas entidades em memória) — é o contrato que a v0.2 implementa.

```sql
-- Extensão vetorial para embeddings faciais
create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ── Identidade e organização ────────────────────────────────────────────

create table users (
    id            uuid primary key default gen_random_uuid(),
    email         text not null unique,
    name          text not null,
    created_at    timestamptz not null default now()
);

create table organizations (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    slug          text not null unique,       -- usado na URL pública: /{org-slug}/{album-slug}
    logo_url      text,
    created_at    timestamptz not null default now()
);

create type organization_role as enum ('owner', 'admin', 'member');

create table organization_memberships (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    user_id         uuid not null references users(id) on delete cascade,
    role            organization_role not null default 'member',
    created_at      timestamptz not null default now(),
    unique (organization_id, user_id)
);

-- ── Produtos e assinaturas (independente vs. add-on do ecossistema) ─────

create table products (
    id    uuid primary key default gen_random_uuid(),
    slug  text not null unique,   -- 'descomplica-fotos', 'descomplica-church', ...
    name  text not null
);

create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create table subscriptions (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    product_id      uuid not null references products(id),
    status          subscription_status not null default 'trialing',
    plan            text not null default 'standard',   -- ex.: 'standard', 'addon-church'
    created_at      timestamptz not null default now(),
    unique (organization_id, product_id)
);

-- ── Álbuns ────────────────────────────────────────────────────────────

create type album_status as enum ('draft', 'processing', 'published', 'error');

create table albums (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    name            text not null,
    slug            text not null,             -- único dentro da organização, não globalmente
    description     text,
    event_date      date,
    cover_photo_id  uuid,                       -- referencia photos(id); FK adicionada após criar photos
    status          album_status not null default 'draft',
    is_public       boolean not null default false,
    match_threshold real not null default 0.45, -- calibrável por álbum, como no MVP
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (organization_id, slug)
);

-- ── Fotos ─────────────────────────────────────────────────────────────

create type photo_status as enum ('uploading', 'queued', 'processing', 'ready', 'error');

create table photos (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    album_id        uuid not null references albums(id) on delete cascade,
    storage_key     text not null,      -- caminho no object storage (original)
    thumbnail_key   text,               -- caminho no object storage (thumbnail)
    width           integer,
    height          integer,
    status          photo_status not null default 'queued',
    error_message   text,
    source          text not null default 'upload', -- 'upload' | 'google_drive'
    created_at      timestamptz not null default now()
);

alter table albums
    add constraint albums_cover_photo_fk
    foreign key (cover_photo_id) references photos(id) on delete set null;

-- ── Rostos (embeddings) ──────────────────────────────────────────────

create table faces (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    album_id        uuid not null references albums(id) on delete cascade,
    photo_id        uuid not null references photos(id) on delete cascade,
    embedding       vector(512) not null,   -- saída do buffalo_sc (ArcFace/MobileFaceNet)
    bbox            jsonb not null,          -- {x, y, w, h} relativo à foto original
    detection_score real,
    created_at      timestamptz not null default now()
);

-- Índice vetorial por álbum: a busca NUNCA cruza album_id, então um índice
-- global bastaria, mas particionar por album_id mantém buscas rápidas mesmo
-- com muitos álbuns/organizações no mesmo banco.
create index faces_album_id_idx on faces (album_id);
create index faces_embedding_idx on faces using ivfflat (embedding vector_cosine_ops);

-- ── Jobs de processamento (fila em SQL) ──────────────────────────────

create type job_type as enum ('ingest_upload', 'ingest_drive', 'generate_thumbnail', 'detect_faces');
create type job_status as enum ('pending', 'running', 'succeeded', 'failed');

create table processing_jobs (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    album_id        uuid not null references albums(id) on delete cascade,
    photo_id        uuid references photos(id) on delete cascade,
    type            job_type not null,
    status          job_status not null default 'pending',
    attempts        integer not null default 0,
    error_message   text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index processing_jobs_pending_idx on processing_jobs (status, created_at) where status = 'pending';

-- ── Integração com Google Drive (interface preparada, fluxo real na v0.2) ─

create table google_drive_connections (
    id                uuid primary key default gen_random_uuid(),
    organization_id   uuid not null unique references organizations(id) on delete cascade,
    connected_by_user uuid references users(id),
    -- tokens OAuth ficam num cofre de segredos (ex.: KMS-encrypted column ou
    -- secret manager), nunca em texto puro nesta tabela.
    access_token_ref  text,
    refresh_token_ref text,
    scope             text,
    connected_at      timestamptz,
    created_at        timestamptz not null default now()
);

-- ── Métricas (busca) ──────────────────────────────────────────────────

create table album_searches (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id) on delete cascade,
    album_id        uuid not null references albums(id) on delete cascade,
    match_count     integer not null,
    created_at      timestamptz not null default now()
);
create index album_searches_album_id_idx on album_searches (album_id);
```

## Decisões deliberadas

- **`organization_id` duplicado em tabelas filhas** (`photos`, `faces`, `processing_jobs`, `album_searches`): every tenant-scoped query filters directly por `organization_id` sem depender de um join até `albums`, o que facilita tanto performance quanto uma futura política de Row-Level Security (`USING (organization_id = current_setting('app.current_org')::uuid)`).
- **`album.slug` único por organização, não globalmente**: a URL pública é `/{organization.slug}/{album.slug}` — o par é que precisa ser único.
- **Sem tabela de "usuário final" do álbum público**: o visitante nunca cria conta; `album_searches` registra só a métrica agregada (quantas buscas, quantos resultados), nunca a selfie nem um identificador de pessoa.
- **`match_threshold` por álbum**: preserva a calibração que já existia no MVP (`MATCH_THRESHOLD` global), mas agora por álbum em vez de por deploy.
- **`google_drive_connections` por organização, não por álbum**: uma igreja conecta o Drive uma vez; cada álbum decide de qual pasta importar (campo a adicionar em v0.2, quando o fluxo OAuth/Picker for implementado).
