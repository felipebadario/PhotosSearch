# Serviço de rostos (worker)

Lê as fotos da fila, grava os rostos e responde a busca por selfie. Usa o motor do MVP (`face-search-service/app/face_service.py`, InsightFace `buffalo_sc`, vetores de 512 dimensões, limiar 0,45), sem alterá-lo.

- **Indexação:** `photos.status` vai de `queued` a `processing` e depois `indexed` ou `error`. A reserva usa `FOR UPDATE SKIP LOCKED`, então várias máquinas não pegam a mesma foto. Até 3 tentativas; o motivo da falha fica em `photos.error_message` e aparece no Admin. Foto presa em `processing` por mais de 10 minutos volta para a fila. Uma foto que já está `indexed` nunca é reprocessada.
- **Busca:** `POST /search` (multipart: `selfie`, `organization_id`, `collection_id`, `threshold`). Compara a selfie só com os rostos do acervo pedido, de forma exata, e devolve o melhor resultado por foto. A selfie vive só em memória; nada dela é gravado.
- **Segurança:** todas as rotas, menos `/health`, exigem `Authorization: Bearer $WORKER_SECRET`. Só o Next.js chama este serviço.
- **Comparação em memória, não pgvector:** os rostos de um acervo ficam num cache em memória (2 KB por rosto) que se renova sozinho quando entram ou saem fotos. Para acervos muito grandes, o próximo passo é o pgvector.

## Variáveis

`DATABASE_URL`, `WORKER_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. No Next: `WORKER_URL` e `WORKER_SECRET`.

## Testes

```bash
cd web && npm ci && DATABASE_URL=... npm run db:migrate   # o worker usa as tabelas do web
cd ../worker && pip install -r requirements-dev.txt && DATABASE_URL=... python -m pytest -q
```

Os testes usam um motor de mentira. Para exercitar o caminho completo sem o modelo, `NFWORKER_ENGINE=dev` troca o motor por um que agrupa imagens por cor (apenas desenvolvimento; não reconhece rostos).

## Publicação

`.github/workflows/worker.yml` testa e, na `main`, publica no Fly.io (app `nossafoto-worker`, região `gru`, 1 GB) quando o segredo `FLY_API_TOKEN` existe no GitHub.
