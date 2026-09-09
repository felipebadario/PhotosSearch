import { cn } from "@/lib/cn";

const STEPS = ["Detalhes", "Origem das fotos", "Processamento", "Publicar"] as const;

export function WizardSteps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2 sm:gap-3">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "upcoming";
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                state === "done" && "bg-df-primary text-df-white",
                state === "active" && "bg-df-accent text-df-white",
                state === "upcoming" && "bg-df-line text-df-muted",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "hidden text-xs font-semibold sm:inline",
                state === "upcoming" ? "text-df-muted" : "text-df-ink",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1",
                  state === "done" ? "bg-df-primary" : "bg-df-line",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
