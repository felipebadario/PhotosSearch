# Arquitetura — NossaFoto

Stack mantida: Next.js na Vercel, engine facial em Python, Postgres com pgvector (Neon), fotos no Cloudflare R2 e um worker no Fly.io. A engine sai do build do Render e passa a rodar num worker que consome uma fila.

```
NossaFoto Admin (instituição)      NossaFoto Search (participante, link ou QR Code)
            \                         /
             Next.js na Vercel: telas, rotas de API, controle de acesso por organização
            /            |              \
 Postgres + pgvector   Cloudflare R2     Worker Python (Fly.io)
 dados, vetores, fila  originais e       engine facial atual
                       miniaturas         ^
                                          | Fontes externas: Google Drive (P1), OneDrive e Dropbox (P2)
```

O navegador nunca fala direto com o banco ou com o worker. Toda chamada passa pelo Next.js, que aplica a organização da sessão ou o escopo do link.

## Multi-tenant

- O tenant é a **Organização**, com membros e papéis (dono, administrador, editor).
- Toda tabela carrega `organization_id`, inclusive fotos, rostos, jobs e buscas.
- Toda consulta passa por uma função de acesso que exige a organização da sessão. Row-Level Security no Postgres é a segunda barreira.
- A busca filtra por organização e por acervos autorizados antes de comparar vetores. Não existe busca entre instituições.
- Modelo horizontal: nenhum campo é específico de um segmento; o segmento é só um rótulo na organização.

## Acervos

- `Collection` é o acervo: `permanent` (contínuo, vários álbuns) ou `event` (com `starts_at`, `ends_at`, `public_until` e retenção).
- Um cliente pode ter os dois tipos ao mesmo tempo; ambos usam a mesma engine.
- Depois de `public_until`, o link do evento mostra "evento encerrado". Depois da retenção, um job apaga os embeddings e, se configurado, as fotos.
- A mesma foto pode estar em mais de um acervo (`collection_photos`) sem contar duas vezes.

## Ingestão

- **Upload direto:** o navegador envia ao R2 por URL assinada, em lotes. O worker calcula o SHA-256; se o hash já existe na organização, a foto é só vinculada, sem nova cópia nem nova contagem.
- **Integrações:** cada provedor implementa a mesma interface (listar, baixar, detectar mudanças). O NossaFoto guarda a referência ao original e uma miniatura própria. Capacidades de cada API são validadas antes de construir.

## Pipeline de indexação

1. A foto é registrada como `queued` e um job entra em `processing_jobs`.
2. O worker reserva o job com `FOR UPDATE SKIP LOCKED` e baixa a imagem.
3. Valida o arquivo, calcula o hash, gera a miniatura e detecta os rostos com `face-search-service/app/face_service.py`.
4. Grava os embeddings em `faces` e marca a foto como `indexed`. Só então ela entra na franquia.

Uma foto com o mesmo hash e a mesma versão de modelo nunca é reprocessada. Tentativas têm limite e erros aparecem no Painel.

## Busca facial

1. A rota de busca recebe a selfie e repassa ao worker (endpoint síncrono), sem gravar.
2. O worker devolve o embedding.
3. A rota consulta o pgvector filtrando por organização e pelos acervos do link, e devolve URLs assinadas de curta duração.
4. Selfie e embedding são descartados; o log guarda só a contagem de resultados.

## Permissões

- Administração: membros da organização, por papel.
- Participante: `link` (sem cadastro), `link + código` (código do evento) ou `restrito` (login por código enviado por e-mail).
- A selfie não é prova de identidade: só ordena resultados dentro do que o link já permite ver.
- Download liberado ou bloqueado por acervo.

## Contabilização

- Consumo = `content_hash` distintos, não excluídos, com status `indexed`, na organização.
- Franquia checada na importação; excesso fica bloqueado com pedido de upgrade. Exclusão definitiva libera na hora.
- Eventos com `event_passes` consomem do próprio pacote.
- Preços, limites e recursos ficam na tabela `plans`: mudar um preço não exige deploy.
- Busca nunca é cobrada; tem só limites técnicos (taxa por IP e por link, tamanho de arquivo, captcha leve em excesso).

## Armazenamento e processamento

- R2: originais enviados e miniaturas em `org/{id}/...`, sempre por URL assinada, sem bucket público.
- Worker no Fly.io escala por número de máquinas; a busca tem endpoint síncrono separado da fila.
- O Painel monitora a fila: pendentes, em execução, falhas, idade do job mais antigo.

## Privacidade e LGPD

- Dado biométrico é dado sensível. A instituição é controladora; o NossaFoto é operador, com contrato de tratamento de dados.
- Aviso claro e consentimento explícito antes da selfie.
- Pessoas fotografadas podem pedir remoção: o rosto é excluído e não é reindexado.
- Retenção por acervo, exclusão em cascata e trilha de auditoria das ações administrativas.
- Base legal e textos finais passam por revisão jurídica antes do lançamento.

## Design system

Mantido da Fase 1, em `web/app/globals.css` (prefixo `nf`): fundo `#f7f7f5`, superfícies brancas, texto `#16171a`, acento único `#4f46e5`, tipografia Geist, raios de 8 a 24 px. Admin com cara de SaaS premium; Search emocional, visual e muito simples, pensado primeiro para o celular.
