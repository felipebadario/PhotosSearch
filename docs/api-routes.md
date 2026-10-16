# Rotas — NossaFoto

Contrato que a Fase 2 implementa de verdade contra Postgres, R2 e a fila. Na Fase 1 o app chama funções equivalentes em `web/lib/api/*.ts` (leituras) e `web/lib/actions/*.ts` (mutações), que usam `web/lib/mock-data.ts`. As assinaturas e os formatos já seguem este contrato.

"Conta" abaixo é sempre a conta do usuário autenticado. Na Fase 1 não há autenticação, então ela é fixa.

## App (autenticado, escopo: conta)

| Rota | Descrição | Fase 1 |
|---|---|---|
| `GET /api/library` | Resumo do acervo (fotos, álbuns, fontes) | demo (`getLibrarySummary`) |
| `GET /api/photos?album&source&period` | Fotos do acervo com filtros | demo (`listLibraryPhotos`) |
| `GET /api/albums` | Álbuns da conta | demo (`listAlbums`) |
| `GET /api/albums/:id` | Detalhe do álbum | demo (`getAlbum`) |
| `GET /api/albums/:id/photos` | Fotos do álbum | demo (`listAlbumPhotos`) |
| `PATCH /api/albums/:id` | Nome, data, descrição, precisão da busca | demo (`updateAlbumAction`) |
| `POST /api/albums/:id/publish` | Cria o link público | demo (`publishAlbumAction`) |
| `DELETE /api/albums/:id/publish` | Para de compartilhar | demo (`unpublishAlbumAction`) |
| `POST /api/imports` | Inicia importação (destino, origem, quantidade) | demo (`startImportAction`) |
| `POST /api/imports/:id/files` | Envio dos arquivos (multipart ou URL assinada do R2) | não implementado |
| `GET /api/imports` | Histórico de importações | demo (`listImports`) |
| `POST /api/search/face` | Foto de referência + escopo (acervo ou álbum) → fotos | demo (`searchByFaceAction`) |
| `POST /api/search/description` | Texto → fotos | não implementado |
| `GET /api/account` | Perfil, assinatura, consumo | demo |
| `GET /api/sources/google-drive` | Status da conexão | não implementado |

## Público (sem autenticação, escopo: um álbum compartilhado)

| Rota | Descrição | Fase 1 |
|---|---|---|
| `GET /api/public/:handle/:albumSlug` | Metadados do álbum público | demo (`getPublicAlbum`) |
| `POST /api/public/:handle/:albumSlug/search` | Selfie → fotos daquele álbum | demo (`searchPublicAlbumAction`) |

Nas rotas de busca, o app chama a engine com `(account_id, album_id?, foto)`, recebe `photo_id` + similaridade, resolve para URLs assinadas e **descarta a foto e o embedding logo após responder**.

## Fora de escopo por enquanto

- Busca que cruze contas, busca global ou na internet.
- Webhooks de cobrança (Fase 5).
