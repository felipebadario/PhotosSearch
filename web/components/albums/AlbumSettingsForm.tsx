"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { updateAlbumAction } from "@/lib/actions/albums";
import type { Album } from "@/lib/types";

export function AlbumSettingsForm({ album }: { album: Album }) {
  const router = useRouter();
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description ?? "");
  const [eventDate, setEventDate] = useState(album.eventDate ?? "");
  const [threshold, setThreshold] = useState(album.matchThreshold);
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
        matchThreshold: threshold,
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <Field label="Nome do álbum">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Data do evento">
        <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </Field>
      <Field label="Descrição">
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field
        label="Sensibilidade da busca"
        hint="Quanto maior, mais parecida a selfie precisa ser para contar como encontrada. Calibre testando com fotos reais do evento."
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.3}
            max={0.6}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-df-primary"
          />
          <span className="w-12 shrink-0 text-right text-sm font-semibold text-df-ink">
            {threshold.toFixed(2)}
          </span>
        </div>
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
        {saved && <span className="text-sm font-medium text-df-primary">Salvo.</span>}
      </div>
    </form>
  );
}
