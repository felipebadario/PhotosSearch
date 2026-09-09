# Validação — configuração Render Free

## Deploy real no Render (validado)

URL pública: **https://encontre-suas-fotos.onrender.com**

- Build: 1106/1106 JPG/JPEG baixados via API do Google Drive (Service Account), **0 erros**. Índice: 1069 fotos com rosto, 5144 rostos, modelo `buffalo_sc`.
- `GET /api/health` na URL pública: `{"ready": true, "faces": 5144}`.
- Busca real na URL pública: uma foto do próprio acervo, baixada pela rota `/photos/...` e reenviada como selfie a `/api/search`, retornou 24 correspondências — a própria foto em 97,3% e outras fotos genuinamente da mesma pessoa (DIA 1, DIA 2, DIA 3) entre 47% e 80%. Pipeline completo (upload → detecção → embedding → busca) confirmado na infraestrutura real, não só localmente.
- Página inicial (`/`) responde HTTP 200 na URL pública.

### Caminho até o deploy funcionar

O acervo é grande (1106 fotos, pasta pública do Drive não pertencente a esta conta) e passou por três problemas reais antes de funcionar — registrados aqui para não se repetir:

1. **Download anônimo por link público (`gdown`) bloqueado pelo Drive.** Em acervos de milhares de arquivos, o Drive nega arquivos individuais por "excesso de acessos" (`Cannot retrieve the public link... may have had many accesses`). Builds repetidos no mesmo IP do Render pioraram o bloqueio a cada tentativa em vez de melhorar (uma tentativa chegou a rodar por ~2 horas insistindo, até o build falhar). Mitigado no código com retry e um disjuntor de falha sustentada, mas o bloqueio em si só se resolve trocando de abordagem.
2. **Migração para a API oficial do Drive com Service Account** (`download_photos.py` reescrito, ver `check_drive_access.py` para o diagnóstico read-only usado antes de qualquer download em massa). A pasta é pública mas não pertence à conta da service account — mesmo assim a API respeita a permissão "qualquer pessoa com o link pode ver" e a service account conseguiu listar e ler os 1106 arquivos sem nenhum compartilhamento explícito.
3. **Crash de concorrência na própria API autenticada.** Um único cliente `googleapiclient` (transporte `httplib2`, não thread-safe) compartilhado entre as 4 threads de download corrompia a memória do processo (`free(): corrupted unsorted chunks`), matando o build inteiro sem nem passar por uma exceção Python. Corrigido dando um cliente Drive por thread (`thread_service()` em `download_photos.py`).

## Executado neste computador

- Python 3.11.16, Windows x64; InsightFace 1.0.1 e ONNX Runtime em CPU.
- Modelo buffalo_sc real baixado: detector SCRFD 500M e MobileFaceNet.
- 16 testes de contrato/API: multipart, inválidos, limite de upload, sem rosto, maior rosto, EXIF, pickle, caminhos, deduplicação, ordenação, resultados vazios, erro por foto, configuração de armazenamento, interrupção de build e recusa de startup público sem índice.
- Benchmark com imports do servidor, modelo, matriz de 20.000 embeddings, uploads de 8 MiB e cinco consultas sequenciais: pico de 214.4 MiB; tempos de 0.14 a 0.28 segundo.
- Benchmark com JPEG de 48 megapixels (redução no decoder antes de EXIF): pico de 219.5 MiB; consultas de 0.37 a 0.50 segundo.
- As imagens de benchmark são versões de um retrato inteiramente fictício. Os 20.000 embeddings são controlados e ficam somente em RAM. Isso mede processamento e memória, não acurácia com pessoas do evento.
- A implementação anterior foi validada no navegador com seleção, prévia, busca, galeria, modal e nova busca. Corrigido o evento de erro disparado ao remover o src da selfie.

## Resolvido pelo deploy real (histórico)

- A medição de memória acima é do Windows e representa o pico de working set do processo, não o cgroup Linux do Render — mas o deploy real ficou `live` e respondeu buscas normalmente, então o consumo no plano Free (512 MB) se mostrou suficiente na prática.
- O workflow GitHub roda o mesmo benchmark em Linux com OpenCV headless e interrompe se o pico atingir 450 MiB, reservando margem para os 512 MB.
- Despertar após inatividade e acesso HTTPS por outra rede (fora da rede do Render) ainda vale reconfirmar periodicamente, já que o Free dorme após 15 minutos sem tráfego.
- O acesso ao Drive, que falhava neste computador (Windows) e sofreu bloqueio por excesso de acessos no download anônimo, funciona de forma confiável pela API autenticada — ver "Deploy real no Render" acima.
- Fotos originais, acervo e modelos não entram no GitHub. São gerados no build da aplicação. Apenas o retrato fictício do teste é versionado em tests/fixtures.
- Não foram criados serviços pagos; o deploy usa exclusivamente o plano Free do Render.
