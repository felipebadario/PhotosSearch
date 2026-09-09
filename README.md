# Descomplica Fotos

SaaS multi-tenant para igrejas publicarem álbuns de eventos e permitirem que qualquer participante encontre suas próprias fotos com uma selfie — sem criar conta, sem armazenar a selfie.

Produto filho do ecossistema Descomplica: pode ser contratado de forma independente ou como add-on de uma organização que já usa o Descomplica Church (ver `docs/architecture.md`, seção "Modelo organizacional").

## Estrutura do repositório

```
web/                    SaaS: dashboard admin + página pública de busca (Next.js). v0.1, dados mockados.
face-search-service/    Engine de reconhecimento facial (FastAPI + InsightFace). MVP standalone, já publicado.
docs/                   Arquitetura, modelo de dados e contrato de rotas para v0.2 em diante.
```

`web/` é o produto. `face-search-service/` é o motor interno que ele vai consumir — ver `docs/architecture.md` para a separação de camadas. Em v0.1 os dois **não estão conectados em runtime**: o front-end usa dados mockados estruturados exatamente como a v0.2 vai consumir de verdade.

## Por onde começar

- Produto (telas, fluxos, dados mockados): [`web/README.md`](web/README.md)
- Engine de busca facial (já em produção como MVP standalone): [`face-search-service/README.md`](face-search-service/README.md)
- Arquitetura completa, modelo de dados e rotas: [`docs/architecture.md`](docs/architecture.md), [`docs/data-model.md`](docs/data-model.md), [`docs/api-routes.md`](docs/api-routes.md)

## Estado atual (v0.1)

**Real:** estrutura de repositório, design system, todas as telas do admin e a página pública navegáveis com dados mockados, engine de reconhecimento facial (herdada do MVP, publicada e validada em produção).

**Mockado:** toda persistência (organizações, álbuns, fotos, buscas), upload real de arquivos, processamento assíncrono, importação do Google Drive (OAuth), autenticação.

Ver `web/README.md` para o detalhamento tela a tela do que é real vs. mockado, e `docs/architecture.md` para o plano de infraestrutura da v0.2.
