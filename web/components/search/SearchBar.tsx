import Form from "next/form";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Campo de busca por descrição. É um formulário GET para /buscar/descricao,
 * então funciona mesmo antes do JavaScript carregar.
 */
export function SearchBar({
  defaultValue,
  autoFocus,
  size = "lg",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <Form action="/buscar/descricao" role="search" className="relative">
      <label htmlFor="busca-descricao" className="sr-only">
        Descreva a foto que você está procurando
      </label>
      <Sparkles
        size={size === "lg" ? 20 : 18}
        aria-hidden
        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-nf-accent"
      />
      <input
        id="busca-descricao"
        name="q"
        type="search"
        autoComplete="off"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Descreva a foto que você procura..."
        className={cn(
          "w-full rounded-full border border-nf-line bg-nf-surface pl-13 pr-16 text-nf-text shadow-[0_1px_2px_rgba(22,23,26,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-nf-subtle focus:border-nf-accent focus:shadow-nf-focus",
          size === "lg" ? "h-16 text-base sm:text-[17px]" : "h-13 text-[15px]",
        )}
      />
      <button
        type="submit"
        aria-label="Buscar"
        className={cn(
          "absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-nf-ink text-white transition-colors hover:bg-nf-ink-hover",
          size === "lg" ? "h-12 w-12" : "h-10 w-10",
        )}
      >
        <ArrowUp size={20} aria-hidden />
      </button>
    </Form>
  );
}
