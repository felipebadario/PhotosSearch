"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { updateAlbumAction } from "@/lib/actions/albums";
import type { Album } from "@/lib/types";

/** Precisão da busca em três níveis, em vez de expor o limiar numérico. */
const PRECISION_LEVELS = [
  { value: 0.38, label: "Mais resultados", hint: "Mostra também fotos em que a pessoa aparece menos nítida." },
  { value: 0.45, label: "Equilibrado", hint: "Recomendado para a maioria dos álbuns." },
  { value: 0.52, label: "Mais precisão", hint: "Mostra só as fotos em que a pessoa aparece com clareza." },
];

function closestLevel(threshold: number) {
  return PRECISION_LEVELS.reduce((best, level) =>
    Math.abs(level.value - threshold) < Math.abs(best.value - threshold) ? level : best,
  );
}

export function AlbumSettingsForm({ album }: { album: Album }) {
  const router = useRouter();
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description ?? "");
  const [eventDate, setEventDate] = useState(album.eventDate ?? "");
  const [precision, setPrecision] = useState(closestLevel(album.matchThreshold).value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateAlbumAction(album.id, {
        name: name.trim(),
        description: description.trim() || null,
        eventDate: eventDate || null,
        matchThreshold: precision,
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const current = PRECISION_LEVELS.find((l) => l.value === precision) ?? PRECISION_LEVELS[1];

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <Field label="Nome do álbum">
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} required />}
      </Field>
      <Field label="Data">
        {(p) => <Input {...p} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />}
      </Field>
      <Field label="Descrição">
        {(p) => (
          <Textarea {...p} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        )}
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-nf-text">Precisão da busca por rosto</legend>
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-nf-sunken p-1">
          {PRECISION_LEVELS.map((level) => (
            <label
              key={level.value}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-nf-muted has-checked:bg-nf-surface has-checked:text-nf-text has-checked:shadow-[0_1px_2px_rgba(22,23,26,0.08)] has-focus-visible:outline-2 has-focus-visible:outline-nf-accent"
            >
              <input
                type="radio"
                name="precision"
                value={level.value}
                checked={precision === level.value}
                onChange={() => setPrecision(level.value)}
                className="sr-only"
              />
              {level.label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-nf-muted">{current.hint}</p>
      </fieldset>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
        {saved && (
          <span role="status" className="text-sm text-nf-success">
            Alterações salvas.
          </span>
        )}
      </div>
    </form>
  );
}
