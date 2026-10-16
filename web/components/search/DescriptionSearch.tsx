import Link from "next/link";
import { FlaskConical, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SearchBar } from "./SearchBar";

const EXAMPLES = [
  "Eu no parque usando uma camiseta branca",
  "Pôr do sol na praia",
  "Bolo de aniversário com velas",
  "Todos juntos na mesa do jantar",
];

/**
 * Busca por descrição. Ainda não existe motor para isso: a tela recebe a
 * descrição e diz, com honestidade, que a funcionalidade está em
 * desenvolvimento. Nenhum resultado é simulado.
 */
export function DescriptionSearch({ query }: { query?: string }) {
  return (
    <div className="space-y-6">
      <SearchBar defaultValue={query} autoFocus={!query} size="md" />

      {query ? (
        <Card className="animate-nf-rise">
          <CardBody className="flex flex-col items-center py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-nf-accent-soft text-nf-accent">
              <FlaskConical size={22} aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-nf-text">
              A busca por descrição está em desenvolvimento
            </h2>
            <p className="mt-2 max-w-md text-sm text-nf-muted">
              Em breve você vai poder escrever algo como &ldquo;{query}&rdquo; e encontrar a foto
              certa. Por enquanto, nenhuma foto foi buscada para esta descrição.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button href="/buscar/rosto" icon={<Search size={16} aria-hidden />}>
                Buscar por rosto
              </Button>
              <Button
                href="/buscar/filtros"
                variant="secondary"
                icon={<SlidersHorizontal size={16} aria-hidden />}
              >
                Usar filtros
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div>
          <p className="text-sm font-medium text-nf-muted">Experimente descrever</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <Link
                  href={`/buscar/descricao?q=${encodeURIComponent(example)}`}
                  className="inline-flex h-9 items-center rounded-full border border-nf-line bg-nf-surface px-4 text-sm text-nf-text transition-colors hover:border-nf-line-strong"
                >
                  {example}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-nf-muted">
            A busca por descrição ainda está em desenvolvimento e vai chegar numa próxima versão.
          </p>
        </div>
      )}
    </div>
  );
}
