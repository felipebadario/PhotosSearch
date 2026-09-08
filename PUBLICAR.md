# Publicar no Render Free a partir do GitHub

## Configuração pronta

Um único Web Service Python, `plan: free` (512 MB), CPU, sem Docker ou disco persistente. O provedor fornece a URL pública HTTPS. O computador local não participa do serviço.

No painel Render, importe o repositório GitHub pelo Blueprint `render.yaml`. Não selecione upgrade nem adicione disco pago. O nome final da URL será informado após criar o serviço; nenhum endereço público deve ser considerado pronto antes de confirmar o deploy e uma busca real.

A conexão GitHub/Render deve permitir acesso somente ao repositório do MVP. As fotos, modelos e embeddings não devem ser enviados ao GitHub; `.gitignore` os exclui.

## Preparação no build

O comando do Blueprint executa:

```sh
python -m pip install -r requirements.txt
python -m pip uninstall -y opencv-python
python -m pip install opencv-python-headless==5.0.0.93
python build_render.py
```

InsightFace declara `opencv-python` como dependência; a substituição explícita evita bibliotecas gráficas no Linux e evita duas variantes de `cv2` instaladas juntas. O pip pode apontar a ausência dessa distribuição nominal em `pip check`, embora os imports e a inferência usem a variante headless equivalente. Os testes de runtime são obrigatórios.

`build_render.py` baixa e indexa o acervo em `photos/` e `data/` dentro do diretório de build. Esses arquivos fazem parte da versão implantada. Não use `/tmp`, `/var/data`, pre-deploy hook ou uma pasta externa para o acervo no plano Free.

O build falha se o Drive não entregar o acervo completo, houver erro de indexação, não houver rostos ou algum limite for ultrapassado. Nenhum índice fictício é usado como fallback. Em um novo build, corrija a fonte e tente novamente; o Free não oferece Shell/SSH para consertar o disco manualmente.

## Inicialização

```sh
python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
```

O Blueprint define threads em 1 e `MVP_REQUIRE_READY=1`. A aplicação carrega o índice e os dois modelos uma vez. `/api/health` retorna `ready: true` quando a busca está pronta; a câmera só fica habilitada nesse estado.

Antes de compartilhar: confirme o deploy, faça uma busca com selfie real e abra a URL HTTPS pelo celular em 4G/5G. A captura frontal depende do navegador; HEIC deve ser convertido para JPG.

## Limitações consideradas

- O Free dorme após 15 minutos sem tráfego e pode levar cerca de um minuto para acordar. Não há promessa de disponibilidade contínua.
- Escritas feitas em runtime desaparecem em reinícios. O acervo é reconstruído no **build** e restaurado com a versão publicada, sem depender de um disco pago ou de reindexação em cada busca.
- O build tem orçamento de tempo, memória, disco e minutos mensais separado do runtime de 512 MB. Acervos acima de 10 GiB/20.000 rostos exigem rever o escopo. A indexação completa precisa caber no limite de execução do build.
- Fotos originais consomem banda. O Free tem cotas mensais; não habilite pagamentos adicionais sem revisar os custos.
- Picos de memória medidos no Windows não substituem medição no Linux. O workflow `.github/workflows/test.yml` testa CPU e memória no GitHub; valide também os gráficos/logs do Render.
- O acesso ao Drive falhou neste ambiente. É necessário verificar se o build remoto consegue acessar o link; se não conseguir, não haverá busca pública funcional até corrigir a fonte das fotos.

Referências: [Render Free](https://render.com/docs/free), [build pipeline](https://render.com/docs/build-pipeline), [FastAPI](https://render.com/docs/deploy-fastapi), [deploys](https://render.com/docs/deploys).
