# Rotas — NossaFoto

Contrato alvo do P0. Hoje o app em `web/` usa funções equivalentes em `web/lib/api` (leituras) e `web/lib/actions` (mutações) sobre dados de demonstração.

## NossaFoto Admin (autenticado, escopo: organização da sessão)

| Rota | Descrição | Etapa |
|---|---|---|
| `GET /api/dashboard` | Indicadores: indexadas, em processamento, franquia, álbuns, eventos, buscas, taxa de sucesso, erros | P0.5 |
| `GET/POST /api/collections` | Lista e cria acervos (`permanent` ou `event`) | P0.2 |
| `GET/PATCH/DELETE /api/collections/:id` | Detalhe, datas, visibilidade, download, retenção | P0.2 |
| `GET/POST /api/collections/:id/albums` | Álbuns do acervo | P0.2 |
| `POST /api/uploads` | Pede URLs assinadas do R2 para um lote (checa franquia) | P0.2 |
| `POST /api/uploads/complete` | Registra as fotos enviadas e enfileira a indexação | P0.2 |
| `GET /api/collections/:id/photos` | Fotos com status de processamento | P0.3 |
| `DELETE /api/photos/:id` | Exclusão definitiva (libera franquia) | P0.2 |
| `GET /api/jobs` | Estado da fila e erros | P0.3 |
| `POST /api/collections/:id/share` | Gera ou revoga link e código | P0.4 |
| `POST /api/privacy/face-removal` | Registra pedido de remoção de rosto | P0.5 |
| `GET /api/billing` | Plano, consumo e limites | P0.2 (consumo), P1 (cobrança) |
| `GET/POST /api/sources` | Integrações externas | P1 |
| `GET/POST /api/members` | Membros e papéis | P0.1 |

## NossaFoto Search (público, escopo: um link)

| Rota | Descrição | Etapa |
|---|---|---|
| `GET /api/s/:orgSlug/:collectionSlug` | Metadados públicos: nome, capa, estado (aberto, encerrado), se pede código | P0.4 |
| `POST /api/s/:orgSlug/:collectionSlug/search` | Selfie (multipart) + código quando exigido → fotos encontradas com URLs assinadas | P0.4 |

Na busca, a rota chama o worker com a selfie, recebe o embedding, consulta o pgvector com `(organization_id, collection_ids)`, responde e descarta selfie e embedding. Só a contagem vai para `search_logs`.

## Fora do P0

Webhooks de pagamento (P1), busca por descrição (P2), qualquer busca que cruze organizações (nunca).
