import type { Metadata } from "next";
import { DescriptionSearch } from "@/components/search/DescriptionSearch";

export const metadata: Metadata = { title: "Buscar por descrição" };

export default async function DescriptionSearchPage({ searchParams }: PageProps<"/buscar/descricao">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 200) : "";
  return <DescriptionSearch query={query || undefined} />;
}
