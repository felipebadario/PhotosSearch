# Roadmap — NossaFoto

Prioridade absoluta: MVP B2B funcional de ponta a ponta. Cada etapa só termina quando o critério de aceite é demonstrado.

## P0 — MVP B2B

| Etapa | Entrega | Depende de | Critério de aceite |
| --- | --- | --- | --- |
| P0.0 Preparação | Política de branches e deploy, documentação B2B | Aprovação do plano | Trabalho novo aparece só em previews; nossafoto.app muda apenas por PR mesclado na `main` |
| P0.1 Fundação | Neon com o schema, login de administradores, organizações, membros e papéis, Admin com a nova navegação | P0.0 | Teste automatizado prova que a organização A não lê nem altera nada da organização B |
| P0.2 Acervos e upload | Acervos permanentes e eventos com datas, álbuns, upload em lote ao R2, duplicadas, exclusão, contagem de fotos | P0.1 | 500 fotos com 50 repetidas contam 450; excluir 10 libera 10; passar do limite bloqueia com aviso de upgrade |
| P0.3 Indexação | Fila no Postgres, worker no Fly.io com a engine atual, embeddings no pgvector, status no Admin | P0.2 | As 1.106 fotos do MVP indexadas sem erro; rodar de novo não reprocessa nenhuma; falhas aparecem com o motivo |
| P0.4 NossaFoto Search | Página por link e QR Code, consentimento, selfie, busca real, resultados, download quando permitido, limites contra abuso, encerramento automático de eventos | P0.3 | Mesmos acertos do MVP nas selfies de teste; nenhuma selfie gravada (teste); evento vencido mostra "encerrado"; um link não devolve fotos de outro acervo |
| P0.5 Painel e privacidade | Indicadores, retenção, pedido de remoção de rosto, auditoria | P0.4 | Números do Painel batem com o banco; remoção de rosto vale na hora; retenção vencida apaga embeddings |

O MVP do Render só é desligado depois do P0.4 aceito, por decisão do responsável do produto.

## P1 — Evolução comercial e operacional

Google Drive e sincronização (validar antes o escopo OAuth: `drive.readonly` é restrito e exige verificação do Google; `drive.file` com o seletor pode não cobrir pastas inteiras), planos e assinaturas, pagamento por evento (provedor a escolher: Stripe, Asaas ou Mercado Pago), gestão de consumo, monitoramento e performance.

## P2 — Expansão

OneDrive, Dropbox, busca semântica e contextual, compartilhamento avançado, outras integrações.

## P3 — NossaFoto Personal

Produto individual. Apenas registrado; fora do desenvolvimento.
