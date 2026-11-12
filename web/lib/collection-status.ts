export type CollectionStatus = { label: string; tone: "neutral" | "success" | "accent" | "warning" };

/** Situação de um acervo para exibição. Acervos permanentes ficam sempre ativos. */
export function collectionStatus(
  c: { kind: "permanent" | "event"; startsAt: Date | null; endsAt: Date | null; publicUntil: Date | null },
  now = new Date(),
): CollectionStatus {
  if (c.kind === "permanent") return { label: "Ativo", tone: "success" };
  if (c.startsAt && now < c.startsAt) return { label: "Agendado", tone: "neutral" };
  if (c.endsAt && now <= c.endsAt) return { label: "Acontecendo", tone: "accent" };
  const until = c.publicUntil ?? c.endsAt;
  if (until && now <= until) return { label: "Aberto para busca", tone: "success" };
  return { label: "Encerrado", tone: "warning" };
}
