# Validação — configuração Render Free

## Executado neste computador

- Python 3.11.16, Windows x64; InsightFace 1.0.1 e ONNX Runtime em CPU.
- Modelo buffalo_sc real baixado: detector SCRFD 500M e MobileFaceNet.
- 16 testes de contrato/API: multipart, inválidos, limite de upload, sem rosto, maior rosto, EXIF, pickle, caminhos, deduplicação, ordenação, resultados vazios, erro por foto, configuração de armazenamento, interrupção de build e recusa de startup público sem índice.
- Benchmark com imports do servidor, modelo, matriz de 20.000 embeddings, uploads de 8 MiB e cinco consultas sequenciais: pico de 214.4 MiB; tempos de 0.14 a 0.28 segundo.
- Benchmark com JPEG de 48 megapixels (redução no decoder antes de EXIF): pico de 219.5 MiB; consultas de 0.37 a 0.50 segundo.
- As imagens de benchmark são versões de um retrato inteiramente fictício. Os 20.000 embeddings são controlados e ficam somente em RAM. Isso mede processamento e memória, não acurácia com pessoas do evento.
- A implementação anterior foi validada no navegador com seleção, prévia, busca, galeria, modal e nova busca. Corrigido o evento de erro disparado ao remover o src da selfie.

## Ainda depende do deploy

- A medição acima é do Windows e representa o pico de working set do processo; não é uma medição do cgroup Linux do Render.
- O workflow GitHub roda o mesmo benchmark em Linux com OpenCV headless e interrompe se o pico atingir 450 MiB, reservando margem para os 512 MB.
- O deploy precisa confirmar imports Linux, inferência, memória observada no provedor, despertar após inatividade e acesso HTTPS por outra rede.
- O Drive falhou neste ambiente com interrupção da conexão, inclusive no navegador. Não foi baixada nenhuma foto real. O build remoto deverá conseguir baixar o acervo; se falhar, a publicação será interrompida explicitamente.
- Fotos originais, acervo e modelos não entram no GitHub. São gerados no build da aplicação. Apenas o retrato fictício do teste é versionado em tests/fixtures.
- Não há URL pública confirmada neste registro. Não foram criados serviços pagos.
