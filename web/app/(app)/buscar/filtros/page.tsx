import type { Metadata } from "next";
import Form from "next/form";
import { SearchX } from "lucide-react";
import { listAlbums } from "@/lib/api/albums";
import { listLibraryPhotos, type PeriodFilter } from "@/lib/api/library";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { plural } from "@/lib/format";
import type { PhotoSource } from "@/lib/types";

export const metadata: Metadata = { title: "Filtros" };

const SOURCES: PhotoSource[] = ["upload", "device", "google_drive"];
const PERIODS: PeriodFilter[] = ["all", "30d", "year"];

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function FiltersPage({ searchParams }: PageProps<"/buscar/filtros">) {
  const params = await searchParams;
  const albums = await listAlbums();
  const albumId = pick(params.album, albums.map((a) => a.id));
  const source = pick(params.origem, SOURCES);
  const period = pick(params.periodo, PERIODS) ?? "all";
  const photos = await listLibraryPhotos({ albumId, source, period });

  return (
    <div className="space-y-6">
      <Form action="/buscar/filtros" className="grid gap-3 rounded-nf-lg border border-nf-line bg-nf-surface p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="filtro-album">Álbum</Label>
          <Select id="filtro-album" name="album" defaultValue={albumId ?? ""}>
            <option value="">Todos</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filtro-origem">Origem</Label>
          <Select id="filtro-origem" name="origem" defaultValue={source ?? ""}>
            <option value="">Todas</option>
            <option value="upload">Upload direto</option>
            <option value="device">Dispositivo</option>
            <option value="google_drive">Google Drive</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="filtro-periodo">Período</Label>
          <Select id="filtro-periodo" name="periodo" defaultValue={period}>
            <option value="all">Qualquer data</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="year">Este ano</option>
          </Select>
        </div>
        <Button type="submit">Aplicar</Button>
      </Form>

      <p className="text-sm text-nf-muted">
        {plural(photos.length, "foto encontrada", "fotos encontradas")} na amostra do acervo. Filtros por
        local, evento e características visuais chegam com a busca contextual, em desenvolvimento.
      </p>

      {photos.length > 0 ? (
        <PhotoGrid photos={photos} />
      ) : (
        <EmptyState
          icon={<SearchX size={22} aria-hidden />}
          title="Nenhuma foto com esses filtros"
          description="Tente outro período ou remova algum filtro."
          action={
            <Button href="/buscar/filtros" variant="secondary">
              Limpar filtros
            </Button>
          }
        />
      )}
    </div>
  );
}
