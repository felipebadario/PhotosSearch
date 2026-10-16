import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 15 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-nf-sm" />
        ))}
      </div>
    </div>
  );
}
