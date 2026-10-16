# NossaFoto

Encontre a foto que você procura, mesmo entre milhares.

NossaFoto é um app pessoal, vendido por assinatura, para guardar acervos grandes de fotos e encontrar qualquer imagem por rosto, por descrição ou por contexto. Domínio: [nossafoto.app](https://nossafoto.app).

## Estrutura do repositório

```
web/                    App NossaFoto (Next.js 16, Vercel). Fase 1: interface completa com dados de demonstração.
face-search-service/    Engine de busca facial (FastAPI + InsightFace). MVP standalone, já publicado.
docs/                   Arquitetura, modelo de dados e contrato de rotas.
```

`web/` é o produto. `face-search-service/` é o motor interno que ele vai consumir (ver `docs/architecture.md`). Na Fase 1 os dois **não estão conectados em runtime**: a interface usa dados de demonstração em memória, estruturados como a próxima fase vai consumir de verdade.

## Por onde começar

- App (telas, fluxos, dados de demonstração): [`web/README.md`](web/README.md)
- Engine de busca facial: [`face-search-service/README.md`](face-search-service/README.md)
- Arquitetura, modelo de dados e rotas: [`docs/architecture.md`](docs/architecture.md), [`docs/data-model.md`](docs/data-model.md), [`docs/api-routes.md`](docs/api-routes.md)

## Branches e deploy

- `develop`: app NossaFoto. A Vercel publica a partir dela, com Root Directory `web`.
- `main`: MVP facial original, publicado no Render. Não é alterada por este trabalho.

## Estado atual (Fase 1)

**Real:** identidade visual e design system, todas as telas navegáveis (Início, Buscar, Meu Acervo, Fontes, Minha Conta, página pública de álbum), validação real de arquivos na importação, QR Code e link de compartilhamento, engine facial do MVP (publicada e validada).

**Demonstração:** toda persistência (conta, álbuns, fotos, importações), envio real de arquivos, processamento, resultados da busca facial, autenticação.

**Ainda não implementado (sinalizado na interface):** busca por descrição, busca contextual, Google Drive, assinaturas e cobrança.

## Próximas fases

1. ~~Identidade e interface com dados de demonstração~~ (Fase 1)
2. **Fundação:** autenticação, Postgres (Neon) com o modelo de `docs/data-model.md`, armazenamento de fotos (Cloudflare R2).
3. **Processamento:** fila de jobs em SQL e worker facial (Fly.io) chamando a engine de `face-search-service/`, gravando embeddings com pgvector.
4. **Busca e compartilhamento reais:** busca facial no acervo da conta e na página pública do álbum.
5. **Assinaturas:** planos e cobrança.
6. **Novas fontes e buscas:** Google Drive, busca por descrição e contextual.

Fora de escopo por enquanto: busca facial global ou na internet, apps nativos, sistema de organizações.
