"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Cloud,
  QrCode,
  Sparkles,
  UploadCloud,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { UploadFileList, type UploadItem } from "./UploadFileList";
import { WizardSteps } from "./WizardSteps";
import {
  commitAlbumPhotosAction,
  createAlbumAction,
  publishAlbumAction,
  startProcessingAction,
} from "@/lib/actions/albums";

type Step = "details" | "source" | "drive-soon" | "upload" | "ready" | "published";

const stepIndex: Record<Step, number> = {
  details: 0,
  source: 1,
  "drive-soon": 1,
  upload: 2,
  ready: 3,
  published: 3,
};

export function NewAlbumWizard() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("details");
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [albumName, setAlbumName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");

  const [items, setItems] = useState<UploadItem[]>([]);
  const [phaseLabel, setPhaseLabel] = useState("Enviando suas fotos");
  const [progress, setProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!albumName.trim()) return;
    setCreating(true);
    try {
      const album = await createAlbumAction({
        name: albumName.trim(),
        eventDate: eventDate || null,
        description: description.trim() || null,
      });
      setAlbumId(album.id);
      setStep("source");
    } finally {
      setCreating(false);
    }
  }

  function handleFilesChosen(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !albumId) return;
    const files = Array.from(fileList).map((f, i) => ({
      id: `${i}-${f.name}`,
      name: f.name,
      status: "pending" as const,
    }));
    setItems(files);
    setStep("upload");
    void runUploadSimulation(files);
  }

  async function runUploadSimulation(files: UploadItem[]) {
    if (!albumId) return;
    await startProcessingAction(albumId);
    setPhaseLabel("Enviando suas fotos");
    setProgress(0);

    // Anima o envio arquivo a arquivo (client-side; sem round-trip por foto —
    // ver comentário em lib/actions/albums.ts). ~1 em cada 20 falha, para a
    // lista mostrar erro individual sem travar o restante.
    const stepDelay = Math.max(15, Math.min(90, 1800 / files.length));
    const working = [...files];
    for (let i = 0; i < working.length; i++) {
      working[i] = { ...working[i], status: "uploading" };
      setItems([...working]);
      await new Promise((r) => setTimeout(r, stepDelay));
      const failed = i > 0 && i % 20 === 0;
      working[i] = failed
        ? { ...working[i], status: "error", errorMessage: "Não foi possível ler o arquivo." }
        : { ...working[i], status: "done" };
      setItems([...working]);
      setProgress(Math.round(((i + 1) / working.length) * 100));
    }

    setPhaseLabel("Analisando as fotos");
    await new Promise((r) => setTimeout(r, 900));

    const succeeded = working.filter((f) => f.status === "done").length;
    await commitAlbumPhotosAction(albumId, succeeded);
    setStep("ready");
  }

  async function handlePublish() {
    if (!albumId) return;
    setPublishing(true);
    try {
      await publishAlbumAction(albumId);
      setStep("published");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <WizardSteps current={stepIndex[step]} />

      {step === "details" && (
        <Card>
          <CardBody className="space-y-5 pt-6">
            <div>
              <h2 className="font-display text-lg font-bold text-df-ink">
                Vamos criar seu álbum
              </h2>
              <p className="mt-1 text-sm text-df-muted">
                Você poderá adicionar uma foto de capa depois, escolhendo entre as fotos do
                próprio álbum.
              </p>
            </div>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <Field label="Nome do álbum">
                <Input
                  autoFocus
                  placeholder="Ex.: Conferência 2026"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Data do evento (opcional)">
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </Field>
              <Field label="Descrição (opcional)">
                <Textarea
                  rows={3}
                  placeholder="Uma frase sobre o evento, para os participantes."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={!albumName.trim() || creating}>
                  {creating ? "Criando..." : "Continuar"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {step === "source" && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-df-ink">
              Como deseja adicionar fotos?
            </h2>
            <p className="mt-1 text-sm text-df-muted">
              Você pode enviar arquivos diretamente ou importar de uma pasta do Google Drive.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-df-line bg-df-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-df-primary/40 hover:shadow-df-soft"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-df-mint-soft text-df-primary">
                <UploadCloud size={20} />
              </span>
              <span className="font-display font-bold text-df-ink">Upload direto</span>
              <span className="text-sm text-df-muted">
                Arraste ou selecione as fotos do seu computador ou celular.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep("drive-soon")}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-df-line bg-df-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-df-primary/40 hover:shadow-df-soft"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-df-mint-soft text-df-primary">
                <Cloud size={20} />
              </span>
              <span className="font-display font-bold text-df-ink">Google Drive</span>
              <span className="text-sm text-df-muted">
                Importe as fotos direto de uma pasta que você já organizou no Drive.
              </span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesChosen(e.target.files)}
          />
        </div>
      )}

      {step === "drive-soon" && (
        <Card>
          <CardBody className="items-center pt-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-df-mint-soft text-df-primary">
              <Cloud size={24} />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold text-df-ink">
              Importação do Google Drive chegando em breve
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-df-muted">
              Estamos preparando uma conexão oficial e segura com sua conta do Google. Por
              enquanto, use o upload direto — funciona igual de bem.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setStep("source")}>
                Voltar
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>Usar upload direto</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "upload" && (
        <Card>
          <CardBody className="space-y-5 pt-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-df-accent-soft text-df-accent-dark">
                <Sparkles size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-df-ink">{phaseLabel}...</h2>
                <p className="text-sm text-df-muted">
                  Pode sair desta tela — o álbum continua marcado como &ldquo;Processando&rdquo;
                  na sua lista de álbuns.
                </p>
              </div>
            </div>
            <ProgressBar value={progress} />
            <p className="text-xs text-df-muted">{progress}% concluído</p>
            <UploadFileList items={items} />
          </CardBody>
        </Card>
      )}

      {step === "ready" && (
        <Card>
          <CardBody className="items-center pt-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-df-mint-soft text-df-primary">
              <Check size={26} />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold text-df-ink">
              Seu álbum está pronto
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-df-muted">
              As fotos foram analisadas. Quando publicar, qualquer participante poderá tirar
              uma selfie e encontrar as fotos dele.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" href={albumId ? `/albums/${albumId}` : "/albums"}>
                Revisar antes
              </Button>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? "Publicando..." : "Publicar álbum"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "published" && (
        <Card>
          <CardBody className="items-center pt-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-df-accent-soft text-df-accent-dark">
              <QrCode size={24} />
            </span>
            <h2 className="mt-4 font-display text-lg font-bold text-df-ink">
              Álbum publicado!
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-df-muted">
              Compartilhe o link com os participantes — cada um encontra as próprias fotos
              com uma selfie.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  albumId &&
                  startTransition(() => router.push(`/albums/${albumId}/compartilhamento`))
                }
              >
                Ver compartilhamento
              </Button>
              <Button href={albumId ? `/albums/${albumId}` : "/albums"}>Ver álbum</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
