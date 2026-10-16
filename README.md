# NossaFoto

Transformamos grandes acervos de fotografias em experiências inteligentes: cada pessoa encontra suas fotos com uma simples selfie.

NossaFoto é um SaaS B2B/B2B2C, horizontal, para instituições que produzem muitas fotos: igrejas e comunidades, organizadores de eventos, escolas e universidades, fotógrafos profissionais e empresas. Domínio: [nossafoto.app](https://nossafoto.app).

- **NossaFoto Business:** assinatura recorrente, cobrada pelo volume de fotos indexadas.
- **NossaFoto Events:** contratação por evento, com período de disponibilidade.
- **NossaFoto Admin:** painel da instituição.
- **NossaFoto Search:** experiência do participante, por link ou QR Code, sem cadastro e sem pagar nada.

## Estrutura do repositório

```
web/                    NossaFoto Admin e NossaFoto Search (Next.js 16, Vercel)
face-search-service/    Engine facial (FastAPI + InsightFace). Hoje ainda o MVP standalone.
docs/                   Arquitetura, modelo de dados, rotas e roadmap
```

## Documentação

- [Arquitetura](docs/architecture.md)
- [Modelo de dados](docs/data-model.md)
- [Rotas](docs/api-routes.md)
- [Roadmap](docs/roadmap.md)
- App: [`web/README.md`](web/README.md) · Engine: [`face-search-service/README.md`](face-search-service/README.md)

## Branches e deploy

- `main` é a branch principal. A Vercel publica a `main` em produção (nossafoto.app), com Root Directory `web`.
- Todo trabalho acontece em branches de funcionalidade a partir da `main`, que ganham uma URL de preview automática na Vercel.
- Uma mudança só chega à `main`, e portanto a nossafoto.app, por pull request aprovado e mesclado pelo responsável do produto.
- `develop` está descontinuada.
- O MVP facial no Render (`encontre-suas-fotos`) tem deploy automático desligado. Para um deploy manual, o Root Directory do serviço precisa ser `face-search-service`.
- Credenciais ficam só nas variáveis de ambiente da Vercel, do Fly.io e do Neon, nunca no repositório.

## Estado atual

A interface (Fase 1) está publicada com dados de demonstração em memória e ainda segue o direcionamento pessoal anterior. A engine facial está validada em produção como MVP. O que falta para a jornada B2B real está em [docs/roadmap.md](docs/roadmap.md).
