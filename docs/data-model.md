# Modelo de dados — NossaFoto

PostgreSQL + `pgvector`. Todas as tabelas de uma conta carregam `account_id`, mesmo quando alcançável por join, para tornar o isolamento entre tenants explícito em qualquer query e simplificar políticas de Row-Level Security no futuro.

Este schema ainda não está implementado na Fase 1 (`web/lib/mock-data.ts` simula estas entidades em memória). É o contrato que a Fase 2 implementa.

```sql
-- Extensão vetorial para embeddings faciais
create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ── Identidade e conta ────────────────────────────────────────────────

create table users (
    id            uuid primary key default gen_random_uuid(),
    email         text not null unique,
    name          text not null,
    avatar_url    text,
    created_at    timestamptz not null default now()
);

create table accounts (
    id            uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references users(id),
    name          text not null,
    handle        text not null unique,       -- usado na URL pública: /{handle}/{album-slug}
    avatar_url    text,
    created_at    timestamptz not null default now()
);

-- Na Fase 1 cada conta tem só o dono; a tabela permite convidar pessoas depois.
create type account_role as enum ('owner', 'member');

create table account_members (
    account_id    uuid not null references accounts(id) on delete cascade,
    user_id       uuid not null references users(id) on delete cascade,
    role          account_role not null default 'member',
    created_at    timestamptz not null default now(),
    primary key (account_id, user_id)
);

-- ── Planos e assinatura (B2C) ──────────────────────────────────────────

create table plans (
    id              text primary key,        -- ex.: 'preview', 'pessoal', 'plus'
    name            text not null,
    photo_limit     integer not null,
    storage_bytes   bigint not null,
    monthly_searches integer not null
);

create type subscription_status as enum ('preview', 'trialing', 'active', 'past_due', 'canceled');

create table subscriptions (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null unique references accounts(id) on delete cascade,
    plan_id         text not null references plans(id),
    status          subscription_status not null default 'preview',
    provider_ref    text,                    -- id no provedor de pagamento (Fase 5)
    current_period_end timestamptz,
    created_at      timestamptz not null default now()
);

-- ── Álbuns ────────────────────────────────────────────────────────────

create type album_status as enum ('draft', 'processing', 'ready', 'published', 'error');

create table albums (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null references accounts(id) on delete cascade,
    name            text not null,
    slug            text not null,             -- único dentro da conta, não globalmente
    description     text,
    event_date      date,
    cover_photo_id  uuid,                       -- referencia photos(id); FK adicionada após criar photos
    status          album_status not null default 'draft',
    is_public       boolean not null default false,
    match_threshold real not null default 0.45, -- calibrável por álbum, como no MVP
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (account_id, slug)
);

-- ── Fotos ─────────────────────────────────────────────────────────────

create type photo_status as enum ('uploading', 'queued', 'processing', 'ready', 'error');

create table photos (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null references accounts(id) on delete cascade,
    album_id        uuid references albums(id) on delete set null, -- foto pode estar só no acervo
    storage_key     text not null,      -- caminho no object storage (original)
    thumbnail_key   text,               -- caminho no object storage (thumbnail)
    width           integer,
    height          integer,
    status          photo_status not null default 'queued',
    error_message   text,
    source          text not null default 'upload', -- 'upload' | 'device' | 'google_drive'
    taken_at        timestamptz,        -- data da foto (EXIF), usada nos filtros
    created_at      timestamptz not null default now()
);

alter table albums
    add constraint albums_cover_photo_fk
    foreign key (cover_photo_id) references photos(id) on delete set null;

-- ── Rostos (embeddings) ──────────────────────────────────────────────

create table faces (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null references accounts(id) on delete cascade,
    photo_id        uuid not null references photos(id) on delete cascade,
    embedding       vector(512) not null,   -- saída do buffalo_sc (ArcFace/MobileFaceNet)
    bbox            jsonb not null,          -- {x, y, w, h} relativo à foto original
    detection_score real,
    created_at      timestamptz not null default now()
);

-- A busca NUNCA cruza account_id; a busca dentro de um álbum faz join com photos.
create index faces_account_id_idx on faces (account_id);
create index faces_embedding_idx on faces using hnsw (embedding vector_cosine_ops);

-- ── Jobs de processamento (fila em SQL) ──────────────────────────────

create type import_status as enum ('uploading', 'processing', 'done', 'partial', 'error');

create table imports (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null references accounts(id) on delete cascade,
    album_id        uuid references albums(id) on delete set null,
    source          text not null,           -- 'upload' | 'device' | 'google_drive'
    status          import_status not null default 'uploading',
    total_files     integer not null,
    succeeded       integer not null default 0,
    failed          integer not null default 0,
    created_at      timestamptz not null default now(),
    finished_at     timestamptz
);

create type job_type as enum ('ingest_upload', 'ingest_drive', 'generate_thumbnail', 'detect_faces');
create type job_status as enum ('pending', 'running', 'succeeded', 'failed');

create table processing_jobs (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null references accounts(id) on delete cascade,
    import_id       uuid references imports(id) on delete cascade,
    photo_id        uuid references photos(id) on delete cascade,
    type            job_type not null,
    status          job_status not null default 'pending',
    attempts        integer not null default 0,
    error_message   text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index processing_jobs_pending_idx on processing_jobs (status, created_at) where status = 'pending';

-- ── Google Drive (interface preparada, fluxo real numa fase futura) ───

create table google_drive_connections (
    id                uuid primary key default gen_random_uuid(),
    account_id        uuid not null unique references accounts(id) on delete cascade,
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

create table searches (
    id              uuid primary key default gen_random_uuid(),
    account_id      uuid not null references accounts(id) on delete cascade,
    album_id        uuid references albums(id) on delete set null, -- null = acervo inteiro
    kind            text not null,           -- 'face' | 'description' | 'public_face'
    match_count     integer not null,
    created_at      timestamptz not null default now()
);
create index searches_account_month_idx on searches (account_id, created_at);
```

## Decisões deliberadas

- **`account_id` repetido nas tabelas filhas** (`photos`, `faces`, `imports`, `processing_jobs`, `searches`): toda query filtra direto pela conta, sem join até `albums`. Isso ajuda a performance e uma futura política de Row-Level Security (`USING (account_id = current_setting('app.current_account')::uuid)`).
- **Foto pertence à conta, álbum é opcional**: o acervo é a unidade principal; `photos.album_id` pode ser nulo.
- **`album.slug` único por conta**: a URL pública é `/{account.handle}/{album.slug}`, e é o par que precisa ser único.
- **Sem cadastro de visitante na página pública**: `searches` guarda só a métrica (tipo e quantidade de resultados), nunca a selfie nem um identificador da pessoa.
- **`match_threshold` por álbum**: preserva a calibração do MVP (`MATCH_THRESHOLD` global). Na interface aparece como três níveis de precisão.
- **`google_drive_connections` por conta**: a pessoa conecta o Drive uma vez e escolhe as pastas em cada importação.
