# Serviço de rostos (worker)

Lê as fotos da fila, grava os rostos e responde a busca por selfie.

## Modelo (desde 21/11/2026: `buffalo_l-r50-v1`)

- **Detector `det_10g`** (SCRFD 10G, do pacote InsightFace `buffalo_l`): acha rostos de perfil, inclinados e pequenos que o `det_500m` antigo perdia. Roda em duas escalas (640 e 1024) na indexação.
- **Reconhecedor `w600k_r50`** (ArcFace ResNet-50, WebFace600K): bem mais robusto a óculos, ângulo, luz e idade que o MobileFaceNet antigo. Vetores de 512 dimensões, como antes.
- O recorte do rosto sai da foto reduzida a 1920 px (antes 1280), o que ajuda rostos pequenos em fotos de grupo.
- Rostos com menos de 24 px ou detecção fraca não são gravados (eram fonte de falso positivo). Rostos com menos de 48 px exigem +0,04 de semelhança.
- A selfie é comparada pela média dela com o próprio espelho, e precisa ter o rosto com pelo menos 64 px.
- Memória medida: ~520 MB de pico com os dois modelos carregados. Cabe na máquina de 1 GB.
- Velocidade: cerca de 2 s por foto de 6 rostos num núcleo. Mais lento que antes (o modelo é maior).

**Limiares por nível de precisão** (`config.THRESHOLDS`, ajustáveis sem código pelas variáveis `THRESHOLDS_R50` e `THRESHOLDS_LEGACY`, no formato `solto,equilibrado,rigoroso`). O acervo continua guardando 0.38 / 0.45 / 0.52 e o worker traduz para o nível do modelo: no r50 são 0.30 / 0.34 / 0.40.

**Várias selfies:** `/search` aceita de 1 a 3 campos `selfie` da mesma pessoa. Cada rosto é comparado com o vetor médio delas (limiar normal) e com a selfie mais parecida (limiar + 0,03). Selfie sem rosto é ignorada se outra servir.

**Troca de modelo sem tirar a busca do ar:** cada rosto guarda o `model_version`. Quando a fila está vazia, o worker reprocessa, uma por vez, as fotos `indexed` de modelo anterior (`indexer.reindex_once`), e a foto continua `indexed` o tempo todo. Enquanto houver rostos antigos num acervo, a busca carrega também o modelo antigo (`buffalo_sc`, ~60 MB) e compara cada rosto com a selfie no modelo em que ele foi gravado. `GET /status` mostra `reindex_pending`. Se uma foto falhar na reindexação, ela fica com `model_version = '<versão>:falhou'` e mantém os rostos antigos. `NFWORKER_REINDEX=0` desliga a reindexação.

- **Indexação:** `photos.status` vai de `queued` a `processing` e depois `indexed` ou `error`. A reserva usa `FOR UPDATE SKIP LOCKED`, então várias máquinas não pegam a mesma foto. Até 3 tentativas; o motivo da falha fica em `photos.error_message` e aparece no Admin. Foto presa em `processing` por mais de 10 minutos volta para a fila. Uma foto que já está `indexed` nunca é reprocessada.
- **Busca:** `POST /search` (multipart: 1 a 3 `selfie`, `organization_id`, `collection_id`, `threshold`). Compara a selfie só com os rostos do acervo pedido, de forma exata, e devolve o melhor resultado por foto. A selfie vive só em memória; nada dela é gravado.
- **Segurança:** todas as rotas, menos `/health`, exigem `Authorization: Bearer $WORKER_SECRET`. Só o Next.js chama este serviço.
- **Comparação em memória, não pgvector:** os rostos de um acervo ficam num cache em memória (2 KB por rosto) que se renova sozinho quando entram ou saem fotos. Para acervos muito grandes, o próximo passo é o pgvector.

## Variáveis

`DATABASE_URL`, `WORKER_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` e, opcional, `GOOGLE_API_KEY` (pastas do Drive por link, conferidas a cada `DRIVE_SYNC_MINUTES`, padrão 30). No Next: `WORKER_URL` e `WORKER_SECRET`.

## Testes

```bash
cd web && npm ci && DATABASE_URL=... npm run db:migrate   # o worker usa as tabelas do web
cd ../worker && pip install -r requirements-dev.txt && DATABASE_URL=... python -m pytest -q
```

Os testes usam um motor de mentira. Para exercitar o caminho completo sem o modelo, `NFWORKER_ENGINE=dev` troca o motor por um que agrupa imagens por cor (apenas desenvolvimento; não reconhece rostos).

## Publicação

`.github/workflows/worker.yml` testa e, na `main`, publica no Fly.io (app `nossafoto-worker`, região `gru`, 1 GB) quando o segredo `FLY_API_TOKEN` existe no GitHub.
