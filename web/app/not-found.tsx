import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link href="/" aria-label="NossaFoto, início">
        <Logo size={30} />
      </Link>
      <h1 className="mt-10 text-2xl font-semibold text-nf-text">Não encontramos esta página</h1>
      <p className="mt-2 max-w-sm text-[15px] text-nf-muted">
        O link pode ter mudado ou o álbum deixou de ser compartilhado.
      </p>
      <Button href="/" className="mt-6">
        Voltar ao início
      </Button>
    </div>
  );
}
