"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Cloud, FolderPlus, ImagePlus, Images, Smartphone, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { UploadFileList, type UploadItem } from "./UploadFileList";
import { completeImportAction, startImportAction, type ImportDestination } from "@/lib/actions/imports";
import type { PhotoSource } from "@/lib/types";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";

type DestinationKind = ImportDestination["kind"];
type Phase = "setup" | "uploading" | "preparing" | "done";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Validação real de cada arquivo (tipo e tamanho), feita no navegador. */
function validate(file: File): string | undefined {
  if (!file.type.startsWith("image/")) return "Este arquivo não é uma imagem.";
  if (file.size > MAX_FILE_BYTES) return "Arquivo maior que 50 MB.";
  return undefined;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function ImportFlow({
  albums,
  initialAlbumId,
  initialSource,
}: {
  albums: { id: string; name: string }[];
  initialAlbumId?: string;
  initialSource?: "upload" | "device";
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const deviceRef = useRef<HTMLInputElement>(null);

  const [destination, setDestination] = useState<DestinationKind>(initialAlbumId ? "existing" : "new");
  const [albumName, setAlbumName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [albumId, setAlbumId] = useState(initialAlbumId ?? albums[0]?.id ?? "");
  const [dragging, setDragging] = useState(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [resultAlbumId, setResultAlbumId] = useState<string | null>(null);

  const destinationReady =
    destination === "library" ||
    (destination === "new" && albumName.trim().length > 0) ||
    (destination === "existing" && albumId !== "");

  function buildDestination(): ImportDestination {
    if (destination === "new") {
      return { kind: "new", name: albumName.trim(), eventDate: eventDate || null };
    }
    if (destination === "existing") return { kind: "existing", albumId };
    return { kind: "library" };
  }

  async function handleFiles(fileList: FileList | null, source: PhotoSource) {
    if (!fileList || fileList.length === 0 || !destinationReady) return;
    const files = Array.from(fileList);
    const initial: UploadItem[] = files.map((f, i) => ({
      id: `${i}-${f.name}`,
      name: f.name,
      status: "pending",
    }));
    setItems(initial);
    setPhase("uploading");
    setUploadProgress(0);

    const { importId, albumId: createdAlbumId } = await startImportAction({
      destination: buildDestination(),
      source,
      totalFiles: files.length,
    });
    setResultAlbumId(createdAlbumId);

    // Nesta prévia os bytes não são enviados: o progresso é local, mas a
    // validação de cada arquivo é real.
    const working = [...initial];
    const stepDelay = Math.max(12, Math.min(80, 1600 / files.length));
    for (let i = 0; i < files.length; i++) {
      working[i] = { ...working[i], status: "uploading" };
      setItems([...working]);
      await wait(stepDelay);
      const error = validate(files[i]);
      working[i] = error
        ? { ...working[i], status: "error", errorMessage: error }
        : { ...working[i], status: "done" };
      setItems([...working]);
      setUploadProgress(((i + 1) / files.length) * 100);
    }

    setPhase("preparing");
    for (let p = 0; p <= 100; p += 10) {
      setPrepareProgress(p);
      await wait(120);
    }

    const failed = working.filter((f) => f.status === "error").length;
    await completeImportAction(importId, { succeeded: files.length - failed, failed });
    setPhase("done");
  }

  function reset() {
    setItems([]);
    setPhase("setup");
    setUploadProgress(0);
    setPrepareProgress(0);
    setAlbumName("");
    setEventDate("");
  }

  const succeeded = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;

  if (phase === "uploading" || phase === "preparing") {
    const uploading = phase === "uploading";
    return (
      <Card className="animate-nf-rise">
        <CardBody className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-nf-text" aria-live="polite">
              {uploading ? "Enviando suas fotos..." : "Preparando seu acervo..."}
            </h2>
            <p className="mt-1 text-sm text-nf-muted">
              {plural(items.length, "imagem", "imagens")}
              {failed > 0 && ` · ${plural(failed, "com erro", "com erro")}`}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-nf-muted">
                <span>Envio</span>
                <span className="tabular-nums">{Math.round(uploadProgress)}%</span>
              </div>
              <ProgressBar value={uploadProgress} label="Envio das fotos" />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-nf-muted">
                <span>Preparação para a busca</span>
                <span className="tabular-nums">{prepareProgress}%</span>
              </div>
              <ProgressBar value={prepareProgress} tone="accent" label="Preparação das fotos" />
            </div>
          </div>

          <UploadFileList items={items} />
          <p className="text-xs text-nf-muted">
            Nesta prévia as fotos não saem do seu aparelho; o envio e a preparação são simulados.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card className="animate-nf-rise">
        <CardBody className="flex flex-col items-center py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-nf-success-soft text-nf-success">
            <CheckCircle2 size={28} aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-nf-text" aria-live="polite">
            {succeeded > 0 ? "Importação concluída" : "Nenhuma foto foi importada"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-nf-muted">
            {plural(succeeded, "foto pronta", "fotos prontas")} para a busca
            {failed > 0 && `, ${plural(failed, "arquivo", "arquivos")} com erro`}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button href={resultAlbumId ? `/acervo/albuns/${resultAlbumId}` : "/acervo"}>
              {resultAlbumId ? "Ver álbum" : "Ver acervo"}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Importar mais fotos
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const destinationOptions: { kind: DestinationKind; title: string; text: string; icon: typeof Images }[] = [
    { kind: "new", title: "Novo álbum", text: "Crie um álbum para estas fotos", icon: FolderPlus },
    { kind: "existing", title: "Álbum existente", text: "Adicione a um álbum seu", icon: Images },
    { kind: "library", title: "Só no acervo", text: "Sem álbum, organize depois", icon: ImagePlus },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="destino" className="space-y-3">
        <h2 id="destino" className="text-sm font-medium text-nf-muted">
          1. Para onde vão as fotos?
        </h2>
        <div role="radiogroup" aria-labelledby="destino" className="grid gap-2 sm:grid-cols-3">
          {destinationOptions.map((opt) => {
            const selected = destination === opt.kind;
            const disabled = opt.kind === "existing" && albums.length === 0;
            return (
              <button
                key={opt.kind}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => setDestination(opt.kind)}
                className={cn(
                  "flex items-center gap-3 rounded-nf-lg border bg-nf-surface p-4 text-left transition-colors disabled:opacity-45",
                  selected ? "border-nf-ink ring-1 ring-nf-ink" : "border-nf-line hover:border-nf-line-strong",
                )}
              >
                <opt.icon size={20} className="shrink-0 text-nf-text" aria-hidden />
                <span>
                  <span className="block text-[15px] font-medium text-nf-text">{opt.title}</span>
                  <span className="block text-[13px] text-nf-muted">{opt.text}</span>
                </span>
              </button>
            );
          })}
        </div>

        {destination === "new" && (
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div>
              <Label htmlFor="nome-album">Nome do álbum</Label>
              <Input
                id="nome-album"
                placeholder="Ex.: Viagem a Lisboa"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data-album">Data (opcional)</Label>
              <Input id="data-album" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
        )}
        {destination === "existing" && (
          <div>
            <Label htmlFor="album-existente">Álbum</Label>
            <Select id="album-existente" value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </section>

      <section aria-labelledby="origem" className="space-y-3">
        <h2 id="origem" className="text-sm font-medium text-nf-muted">
          2. De onde vêm as fotos?
        </h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files, "upload");
          }}
          className={cn(
            "rounded-nf-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-nf-accent bg-nf-accent-soft" : "border-nf-line-strong bg-nf-surface",
            !destinationReady && "opacity-60",
          )}
        >
          <UploadCloud size={28} className="mx-auto text-nf-text" aria-hidden />
          <p className="mt-3 text-[15px] font-medium text-nf-text">
            {initialSource === "device" ? "Escolha fotos da galeria" : "Arraste as fotos para cá"}
          </p>
          <p className="mt-1 text-sm text-nf-muted">
            {destinationReady ? "JPG, PNG, HEIC e outros formatos de imagem, até 50 MB cada." : "Antes, dê um nome ao álbum."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              icon={<UploadCloud size={16} aria-hidden />}
              disabled={!destinationReady}
              onClick={() => uploadRef.current?.click()}
            >
              Selecionar arquivos
            </Button>
            <Button
              variant="secondary"
              icon={<Smartphone size={16} aria-hidden />}
              disabled={!destinationReady}
              onClick={() => deviceRef.current?.click()}
            >
              Galeria do celular
            </Button>
          </div>
          <input
            ref={uploadRef}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => void handleFiles(e.target.files, "upload")}
          />
          <input
            ref={deviceRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => void handleFiles(e.target.files, "device")}
          />
        </div>

        <div className="flex items-center gap-3 rounded-nf-lg border border-nf-line bg-nf-surface p-4">
          <Cloud size={20} className="shrink-0 text-nf-subtle" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-nf-text">Google Drive</p>
            <p className="text-[13px] text-nf-muted">Conexão oficial com sua conta Google, em desenvolvimento.</p>
          </div>
          <Badge>Em breve</Badge>
        </div>
      </section>
    </div>
  );
}
