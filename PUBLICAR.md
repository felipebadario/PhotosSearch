# Publicar no Render Free a partir do GitHub

**Já publicado e validado:** https://encontre-suas-fotos.onrender.com (1106 fotos, 5144 rostos, busca real confirmada — detalhes em [VALIDACAO.md](VALIDACAO.md)). O que segue documenta como chegar lá de novo (novo evento, novo acervo, ou um serviço novo).

## Configuração pronta

Um único Web Service Python, `plan: free` (512 MB), CPU, sem Docker ou disco persistente. O provedor fornece a URL pública HTTPS. O computador local não participa do serviço.

No painel Render, importe o repositório GitHub pelo Blueprint `render.yaml`. Não selecione upgrade nem adicione disco pago. O nome final da URL será informado após criar o serviço; nenhum endereço público deve ser considerado pronto antes de confirmar o deploy e uma busca real.

A conexão GitHub/Render deve permitir acesso somente ao repositório do MVP. As fotos, modelos e embeddings não devem ser enviados ao GitHub; `.gitignore` os exclui.

## Credencial do Google Drive (Service Account)

O download é autenticado pela API do Drive; não depende mais do link público anônimo nem do limite de "excesso de acessos" que ele impunha em acervos grandes.

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto e ative a **Google Drive API** (menu "APIs e serviços" → "Ativar APIs e serviços").
2. Em "IAM e administrador" → "Contas de serviço", crie uma service account (qualquer nome; nenhum papel de projeto é necessário).
3. Nessa conta, aba "Chaves" → "Adicionar chave" → "Criar nova chave" → JSON. Baixa um arquivo `.json`.
4. Copie o campo `client_email` desse arquivo e compartilhe a pasta do Drive do acervo com esse e-mail, permissão de **leitor**.
5. No painel do Render, no serviço, adicione uma variável de ambiente `GOOGLE_SERVICE_ACCOUNT_JSON` com o **conteúdo completo** do arquivo `.json` (não o caminho do arquivo). Marque como secreta; ela não faz parte do `render.yaml` e não deve ser commitada.

Sem essa variável (ou com a pasta não compartilhada), `download_photos.py` falha explicitamente já no início do build, sem tentar nenhum fallback anônimo.

A pasta pode ser pública sem pertencer à conta da service account (foi o caso do acervo de 1106 fotos validado): a API respeita a permissão "qualquer pessoa com o link pode ver" mesmo para service accounts, sem exigir o compartilhamento explícito do passo 4. Se o acesso ainda assim falhar, rode `python check_drive_access.py` (autentica, testa `files.get` no folder ID e lista recursivamente, sem baixar nada) para isolar exatamente onde: credencial ausente/errada, folder ID errado, ou permissão insuficiente.

Downloads rodam em paralelo (`ThreadPoolExecutor`); o cliente da API (`googleapiclient`, transporte `httplib2`) não é thread-safe, então `download_photos.py` cria um cliente por thread (`thread_service()`) em vez de reusar um único objeto. Compartilhar um único cliente entre threads chegou a corromper a memória do processo (`free(): corrupted unsorted chunks`) e derrubar o build inteiro sem nenhuma exceção Python — não reverta essa parte achando que é sobra de refatoração.

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

Antes de compartilhar: confirme o deploy, faça uma busca com selfie real e abra a URL HTTPS pelo celular em 4G/5G. A captura frontal depende do navegador; HEIC deve ser convertido para JPG. (No deploy validado, a busca real foi feita com uma foto do próprio acervo, baixada pela URL pública e reenviada como selfie — ver VALIDACAO.md.)

## Limitações consideradas

- O Free dorme após 15 minutos sem tráfego e pode levar cerca de um minuto para acordar. Não há promessa de disponibilidade contínua.
- Escritas feitas em runtime desaparecem em reinícios. O acervo é reconstruído no **build** e restaurado com a versão publicada, sem depender de um disco pago ou de reindexação em cada busca.
- O build tem orçamento de tempo, memória, disco e minutos mensais separado do runtime de 512 MB. Acervos acima de 10 GiB/20.000 rostos exigem rever o escopo. A indexação completa precisa caber no limite de execução do build.
- Fotos originais consomem banda. O Free tem cotas mensais; não habilite pagamentos adicionais sem revisar os custos.
- Picos de memória medidos no Windows não substituem medição no Linux. O workflow `.github/workflows/test.yml` testa CPU e memória no GitHub; valide também os gráficos/logs do Render.
- O download anônimo por link público chegou a ser tentado e sofreu bloqueio por "excesso de acessos" do Drive em acervos de milhares de arquivos, mesmo a partir do IP de build do Render. A API autenticada por Service Account não depende desse limite de acesso anônimo, e foi o que efetivamente completou o download de 1106 fotos sem erros no deploy validado.

Referências: [Render Free](https://render.com/docs/free), [build pipeline](https://render.com/docs/build-pipeline), [FastAPI](https://render.com/docs/deploy-fastapi), [deploys](https://render.com/docs/deploys).
