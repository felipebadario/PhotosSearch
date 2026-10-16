# Modelo de dados — NossaFoto

PostgreSQL + `pgvector`. Toda tabela de dados de cliente carrega `organization_id`, mesmo quando alcançável por join, para tornar o isolamento explícito em qualquer query e permitir Row-Level Security. Schema alvo do P0; ainda não implementado.

```sql
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ── Organizações e membros ───────────────────────────────────────────

create table users (
    id          uuid primary key default gen_random_uuid(),
    email       text not null unique,
    name        text not null,
    created_at  timestamptz not null default now()
);

create table organizations (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    slug        text not null unique,           -- URL pública: /{slug}/{collection-slug}
    segment     text,                           -- rótulo livre: igreja, eventos, escola, fotografo, empresa
    logo_key    text,
    created_at  timestamptz not null default now()
);

create type member_role as enum ('owner', 'admin', 'editor');

create table organization_members (
    organization_id uuid not null references organizations(id) on delete cascade,
    user_id         uuid not null references users(id) on delete cascade,
    role            member_role not null default 'editor',
    created_at      timestamptz not null default now(),
    primary key (organization_id, user_id)
);

-- ── Planos, assinatura e eventos avulsos (valores são dados, não código) ─

create table plans (
    id            text primary key,             -- 'start', 'pro', 'business', 'enterprise', 'event-...'
    kind          text not null,                -- 'business' | 'event'
    name          text not null,
    photo_limit   integer,                      -- null = personalizado
    price_cents   integer,                      -- null = sob consulta
    currency      text not null default 'BRL',
    features      jsonb not null default '{}',  -- integrações, download, dias de disponibilidade...
    active        boolean not null default true
);

create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create table subscriptions (
    id                 uuid primary key default gen_random_uuid(),
    organization_id    uuid not null unique references organizations(id) on delete cascade,
    plan_id            text not null references plans(id),
    status             subscription_status not null default 'trialing',
    photo_limit        integer,                 -- sobrescreve o plano (Enterprise)
    provider_ref       text,                    -- P1
    current_period_end timestamptz,
    created_at         timestamptz not null default now()
);

-- ── Acervos ──────────────────────────────────────────────────────────

create type collection_kind as enum ('permanent', 'event');
create type visibility as enum ('private', 'link', 'link_code', 'restricted');

create table collections (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    kind             collection_kind not null,
    name             text not null,
    slug             text not null,
    description      text,
    cover_photo_id   uuid,
    visibility       visibility not null default 'private',
    access_code_hash text,                       -- para link_code
    allow_download   boolean not null default true,
    match_threshold  real not null default 0.45,
    starts_at        timestamptz,                -- event
    ends_at          timestamptz,                -- event
    public_until     timestamptz,                -- depois disso, "evento encerrado"
    retention_days   integer,                    -- após public_until; null = manter
    created_at       timestamptz not null default now(),
    unique (organization_id, slug)
);

create table event_passes (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    collection_id    uuid not null unique references collections(id) on delete cascade,
    plan_id          text not null references plans(id),
    photo_limit      integer not null,
    valid_until      timestamptz not null,
    created_at       timestamptz not null default now()
);

create table albums (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    collection_id    uuid not null references collections(id) on delete cascade,
    name             text not null,
    event_date       date,
    cover_photo_id   uuid,
    created_at       timestamptz not null default now()
);

-- ── Fontes e fotos ───────────────────────────────────────────────────

create table sources (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    provider         text not null,              -- 'google_drive' | 'onedrive' | 'dropbox'
    status           text not null,              -- 'connected' | 'error' | 'revoked'
    folders          jsonb not null default '[]',
    token_ref        text,                       -- referência a cofre de segredos, nunca o token
    sync_cursor      text,
    last_synced_at   timestamptz,
    created_at       timestamptz not null default now()
);

create type photo_status as enum ('queued', 'processing', 'indexed', 'error');

create table photos (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    content_hash     bytea,                      -- SHA-256, calculado pelo worker
    origin           text not null,              -- 'upload' | provedor
    source_id        uuid references sources(id) on delete set null,
    external_ref     text,                       -- id do arquivo na fonte externa
    storage_key      text,                       -- original no R2 (upload direto)
    thumbnail_key    text,
    width            integer,
    height           integer,
    taken_at         timestamptz,
    status           photo_status not null default 'queued',
    model_version    text,                       -- evita reprocessar
    error_message    text,
    indexed_at       timestamptz,
    created_at       timestamptz not null default now()
);
-- Uma foto por conteúdo dentro da organização: base da deduplicação e da franquia.
create unique index photos_org_hash_uidx on photos (organization_id, content_hash) where content_hash is not null;

create table collection_photos (
    organization_id  uuid not null references organizations(id) on delete cascade,
    collection_id    uuid not null references collections(id) on delete cascade,
    photo_id         uuid not null references photos(id) on delete cascade,
    album_id         uuid references albums(id) on delete set null,
    added_at         timestamptz not null default now(),
    primary key (collection_id, photo_id)
);

-- ── Rostos ───────────────────────────────────────────────────────────

create table faces (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    photo_id         uuid not null references photos(id) on delete cascade,
    embedding        vector(512) not null,       -- buffalo_sc, normalizado
    bbox             jsonb not null,
    detection_score  real,
    created_at       timestamptz not null default now()
);
create index faces_org_idx on faces (organization_id);
create index faces_embedding_idx on faces using hnsw (embedding vector_cosine_ops);

create table face_removals (                     -- pedidos LGPD: não reindexar
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    photo_id         uuid references photos(id) on delete set null,
    bbox             jsonb,
    reason           text,
    created_at       timestamptz not null default now()
);

-- ── Filas ────────────────────────────────────────────────────────────

create type job_type as enum ('index_photo', 'sync_source', 'purge_collection');
create type job_status as enum ('pending', 'running', 'succeeded', 'failed');

create table processing_jobs (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    type             job_type not null,
    photo_id         uuid references photos(id) on delete cascade,
    source_id        uuid references sources(id) on delete cascade,
    collection_id    uuid references collections(id) on delete cascade,
    status           job_status not null default 'pending',
    attempts         integer not null default 0,
    run_after        timestamptz not null default now(),
    error_message    text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);
create index processing_jobs_pending_idx on processing_jobs (run_after) where status = 'pending';

-- ── Métricas e auditoria (nunca selfie nem embedding da selfie) ──────

create table search_logs (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    collection_id    uuid references collections(id) on delete set null,
    match_count      integer not null,
    created_at       timestamptz not null default now()
);
create index search_logs_org_time_idx on search_logs (organization_id, created_at);

create table audit_logs (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references organizations(id) on delete cascade,
    actor_user_id    uuid references users(id) on delete set null,
    action           text not null,
    target           text,
    metadata         jsonb not null default '{}',
    created_at       timestamptz not null default now()
);
```

## Decisões

- **Consumo da franquia** = `count(*) from photos where organization_id = $1 and status = 'indexed'`. O índice único por `(organization_id, content_hash)` garante que a mesma foto conte uma vez, mesmo em vários acervos.
- **Exclusão definitiva** apaga a linha de `photos` (cascata em `faces` e `collection_photos`) e o objeto no R2, liberando a franquia.
- **Eventos com `event_passes`** contam contra o limite do pacote, não da assinatura.
- **`slug` do acervo é único por organização**: a URL pública é `/{organization.slug}/{collection.slug}`.
- **Participante não tem tabela**: no modo `restricted`, o acesso usa um código por e-mail de curta duração, sem conta permanente.
- **Tokens de integração** ficam num cofre de segredos; a tabela guarda só a referência.
