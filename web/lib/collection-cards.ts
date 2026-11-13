import type { CollectionCardData } from "@/components/collections/CollectionCard";
import { collectionStatus } from "@/lib/collection-status";
import { collectionKindLabel } from "@/lib/labels";
import type { CollectionOverview } from "@/lib/server/repos/photos";

type Row = {
  id: string;
  name: string;
  kind: "permanent" | "event";
  visibility: string;
  startsAt: Date | null;
  endsAt: Date | null;
  publicUntil: Date | null;
};

/** Junta o acervo com os números da visão geral num formato serializável. */
export function toCollectionCard(c: Row, o: CollectionOverview | undefined): CollectionCardData {
  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    subtitle: c.kind === "event" ? eventRange(c.startsAt, c.endsAt) : collectionKindLabel(c.kind),
    status: collectionStatus(c),
    shared: c.visibility === "link",
    photos: o?.photos ?? 0,
    indexed: o?.indexed ?? 0,
    pending: o?.pending ?? 0,
    failed: o?.failed ?? 0,
    recent: o?.recent ?? [],
  };
}

const day = (d: Date, year: boolean) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", ...(year ? { year: "numeric" } : {}), timeZone: "America/Sao_Paulo" });

/** "10/11 a 20/11/2026": curto o bastante para caber no card. */
export function eventRange(start: Date | null, end: Date | null) {
  if (!start || !end) return "Sem data";
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${day(start, !sameYear)} a ${day(end, true)}`;
}
