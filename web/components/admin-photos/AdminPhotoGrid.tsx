"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { removePhotosAction } from "@/lib/actions/photos";
import { plural } from "@/lib/format";
import { cn } from "@/lib/cn";

type GridPhoto = { id: string; name: string | null; status: string };

export function AdminPhotoGrid({ collectionId, photos, canDelete }: { collectionId: string; photos: GridPhoto[]; canDelete: boolean }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function stop() {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(false);
    setError(null);
  }

  function remove() {
    startTransition(async () => {
      const res = await removePhotosAction(collectionId, [...selected]);
      if (res.error) setError(res.error);
      else stop();
    });
  }

  return (
    <div>
      {canDelete && (
        <div className="mb-3 flex min-h-11 flex-wrap items-center justify-end gap-2">
          {!selecting ? (
            <Button variant="secondary" size="sm" onClick={() => setSelecting(true)}>
              Selecionar
            </Button>
          ) : (
            <>
              <span className="mr-auto text-sm text-nf-muted" aria-live="polite">
                {selected.size ? plural(selected.size, "foto selecionada", "fotos selecionadas") : "Toque nas fotos para selecionar"}
              </span>
              {confirming ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={remove}
                  disabled={pending}
                  icon={pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} aria-hidden />}
                >
                  Confirmar exclusão
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirming(true)} disabled={selected.size === 0} icon={<Trash2 size={15} aria-hidden />}>
                  Excluir
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={stop} icon={<X size={15} aria-hidden />}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      )}
      {confirming && (
        <p className="mb-3 rounded-nf bg-nf-danger-soft px-3.5 py-3 text-sm text-nf-danger">
          As fotos saem deste acervo. As que não estiverem em nenhum outro acervo são apagadas de vez e liberam espaço no plano.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-nf bg-nf-danger-soft px-3.5 py-3 text-sm text-nf-danger">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
        {photos.map((p) => {
          const isSelected = selected.has(p.id);
          const img = (
            // As fotos vêm de URLs assinadas e temporárias, fora do otimizador de imagens.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/fotos/${p.id}`} alt={p.name ?? "Foto"} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          );
          return (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-nf-sm bg-nf-sunken">
              {selecting ? (
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Desmarcar" : "Selecionar"} ${p.name ?? "foto"}`}
                  className={cn("block h-full w-full", isSelected && "opacity-70")}
                >
                  {img}
                  <span
                    className={cn(
                      "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow",
                      isSelected ? "bg-nf-accent" : "bg-black/20",
                    )}
                  >
                    {isSelected && <Check size={14} className="text-white" aria-hidden />}
                  </span>
                </button>
              ) : (
                img
              )}
              {p.status === "error" && (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-nf-danger px-2 py-0.5 text-[11px] font-medium text-white">Erro</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
