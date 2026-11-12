import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-nf-canvas">
      <header className="px-5 py-5 sm:px-8">
        <Link href="/" aria-label="NossaFoto, página inicial" className="inline-flex rounded-nf">
          <Logo size={28} />
        </Link>
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
