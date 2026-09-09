# Face Search Service

Engine de busca facial do **Descomplica Fotos** (ver `../README.md` e `../docs/architecture.md` para o produto como um todo). FastAPI, InsightFace em CPU, NumPy e HTML/CSS/JavaScript puro. Sem banco, Docker, cadastro ou armazenamento de selfies.

Este serviço nasceu como o MVP standalone "Encontre suas fotos" e continua funcionando exatamente como antes — é o que o SaaS (`../web/`) vai consumir internamente para detectar rostos e buscar por selfie, hoje ainda por trás de dados mockados no front-end (ver `../docs/architecture.md`).

**No ar e validado (como MVP standalone):** https://encontre-suas-fotos.onrender.com — acervo completo (1106 fotos, 5144 rostos, 0 erros no build) e busca real confirmada na URL pública. Detalhes em [VALIDACAO.md](VALIDACAO.md).

## Publicação

Veja [PUBLICAR.md](PUBLICAR.md). O `render.yaml` usa **plan: free**, um processo e nenhum disco pago. A publicação depende da conta GitHub/Render e de um build bem-sucedido com as fotos reais.

O build instala dependências, troca OpenCV pela variante headless, baixa os JPG/JPEG do Drive e gera `data/faces.pkl`. Fotos, modelos e índice ficam no diretório do aplicativo e compõem a versão publicada. Reinícios restauram essa versão; não há indexação por selfie nem escrita de dados persistentes em runtime. Para atualizar o evento, faça um novo deploy.

## Memória

- Modelo `buffalo_sc` (SCRFD 500M + MobileFaceNet), exclusivamente CPU. Embeddings antigos de `buffalo_l` precisam ser recriados.
- ONNX Runtime com uma thread, execução sequencial, arena de CPU e memory pattern desativados; somente dois modelos carregados.
- Selfie: detector 640 px. Indexação: 640 e 1024 px. Imagem de trabalho até 1280 px, com redução JPEG no decoder antes da correção EXIF.
- Upload até 8 MB; JPEG até 50 MP, PNG/WebP até 8 MP. Sem spool de arquivos em disco.
- Até 20.000 rostos (~39 MiB de matriz float32) e 10 GiB de fotos, com falha explícita se ultrapassar os limites. O limite de fotos reserva margem no build gratuito.
- Uma busca por vez; consultas concorrentes recebem HTTP 429 para tentar novamente. Fotos originais são servidas sob demanda.

O benchmark local mediu picos de 214–220 MiB, incluindo imports do servidor, modelo, 20.000 embeddings e uploads de 8 MiB. Isso não garante o consumo no Linux/Render; o workflow GitHub inclui medição no Linux, e o deploy precisa ser validado no provedor.

## Executar localmente

Com Python 3.11 de 64 bits, nesta pasta:

```sh
python -m venv .venv
```

Windows cmd: `.venv\Scripts\activate`. PowerShell: `.\.venv\Scripts\Activate.ps1`. macOS/Linux: `source .venv/bin/activate`.

```sh
python -m pip install -r requirements.txt
python download_photos.py
python index_photos.py
uvicorn app.main:app --reload
```

Abra http://localhost:8000. Neste computador, há também o atalho `executar-local.ps1` com ações `download`, `index`, `serve` e `test`.

O download usa a API do Google Drive autenticada por uma Service Account e preserva subpastas. Defina `GOOGLE_SERVICE_ACCOUNT_JSON` no ambiente com o conteúdo JSON da credencial (veja [PUBLICAR.md](PUBLICAR.md)) e compartilhe a pasta https://drive.google.com/drive/folders/1ENMCFrad7A-oQKQQEKNylCsG6jU1H-6- com o e-mail dela como leitora. Sem a variável definida, `download_photos.py` falha explicitamente em vez de tentar o link público anônimo.

## Configuração e privacidade

Altere `MATCH_THRESHOLD = 0.45` em `app/config.py` e reinicie/republique. Calibre com pares positivos e negativos do evento. Similaridade não é probabilidade; o modelo menor pode perder precisão, especialmente em fotos difíceis. Não misture modelos no mesmo índice.

`photos/` e `data/` são criados automaticamente relativos ao projeto. `MVP_STORAGE_DIR` pode alterar a raiz em outra hospedagem; no Render Free deixe essa variável ausente. `MVP_REQUIRE_READY=1` impede iniciar a versão pública sem índice/modelo utilizável.

A selfie e seu embedding existem somente durante a requisição, sem logs de conteúdo. O índice contém embeddings do acervo consentido e não é servido por nenhuma rota. Carregue apenas o pickle gerado pelo projeto. Sem login, quem alcançar a URL poderá abrir as fotos.

O [InsightFace](https://pypi.org/project/insightface/) tem código MIT, mas os modelos fornecidos são limitados a pesquisa não comercial; use um modelo licenciado se o uso não estiver coberto.

## Testes

```sh
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -p 'test_*.py' -v
python tests/benchmark_memory.py tests/fixtures/synthetic.jpg
```

A imagem em `tests/fixtures` é inteiramente fictícia e usada só para testes. Não entra em `photos/`. O benchmark cria os embeddings de teste em RAM. Detalhes de execução estão em [VALIDACAO.md](VALIDACAO.md).
