# Rotas — Descomplica Fotos

Convenção de v0.1: as rotas abaixo existem como *contrato* (o que a v0.2 implementa de verdade contra Postgres/Storage/Queue). Em v0.1, o app em `web/` chama funções equivalentes em `web/lib/api/*.ts`, que hoje devolvem dados de `web/lib/mock-data.ts` — a assinatura e o formato de retorno já seguem este contrato para a troca por chamadas HTTP reais ser mecânica.

`org` abaixo sempre significa "a organização do usuário autenticado" — em v0.1 não há autenticação real, então é fixada em uma organização mockada.

## Admin (autenticado, escopo: organização)

| Rota | Descrição | Status em v0.1 |
|---|---|---|
| `GET /api/dashboard` | Estatísticas do mês, álbuns recentes | mock (`getDashboardStats`) |
| `GET /api/albums` | Lista álbuns da organização | mock (`listAlbums`) |
| `POST /api/albums` | Cria álbum (nome, data, capa, descrição) | mock (`createAlbum`) |
| `GET /api/albums/:id` | Detalhe do álbum (contadores, status, url pública) | mock (`getAlbum`) |
| `PATCH /api/albums/:id` | Atualiza nome/data/capa/descrição/threshold | mock (`updateAlbum`) |
| `POST /api/albums/:id/publish` | Publica o álbum (gera/ativa a URL pública) | mock (`publishAlbum`) |
| `POST /api/albums/:id/photos` | Upload direto — multipart, cria `Photo` + `ProcessingJob` | mock (`uploadPhotos`, simula progresso) |
| `POST /api/albums/:id/import/google-drive` | Importa fotos de uma pasta do Drive já conectado | **stub** — interface definida, sem OAuth real ainda |
| `GET /api/albums/:id/photos` | Lista fotos do álbum com status de processamento | mock (`listAlbumPhotos`) |
| `DELETE /api/albums/:id/photos/:photoId` | Remove uma foto | mock |
| `GET /api/integrations/google-drive` | Status da conexão (conectado/desconectado) | mock — sempre "desconectado" |
| `POST /api/integrations/google-drive/connect` | Inicia OAuth (redirect) | **stub** — placeholder de UI, sem fluxo real |
| `GET /api/settings/organization` | Nome, slug, logo da organização | mock |
| `PATCH /api/settings/organization` | Atualiza dados da organização | mock |
| `GET /api/storage` | Uso de armazenamento (bytes usados, limite do plano) | mock |

## Público (sem autenticação, escopo: um álbum publicado)

| Rota | Descrição | Status em v0.1 |
|---|---|---|
| `GET /api/public/:orgSlug/:albumSlug` | Metadados do álbum público (nome, logo, capa, contagem de fotos) | mock (`getPublicAlbum`) |
| `POST /api/public/:orgSlug/:albumSlug/search` | Recebe a selfie (multipart), devolve as fotos com match | mock (`searchAlbumBySelfie` — simula latência e retorna um subconjunto determinístico do mock) |

Em produção, `POST .../search` é o único ponto onde o SaaS chama o Face Search Service: recebe bytes da selfie, chama a engine com `(organization_id, album_id, selfie_bytes)`, recebe uma lista de `photo_id` + similaridade, resolve para URLs assinadas do object storage, **descarta a selfie e o embedding imediatamente após responder**, e grava uma linha em `album_searches` (métrica agregada, nunca a selfie).

## Fora de escopo em v0.1 (mencionadas para não serem esquecidas na v0.2)

- Autenticação/sessão real (hoje: organização fixa, sem login).
- Emissão/validação de QR Code no servidor (v0.1 gera o QR no client a partir da URL pública).
- Webhooks de assinatura/billing.
- Qualquer rota de busca que não seja escopada a um único álbum.
