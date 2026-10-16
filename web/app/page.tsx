import { redirect } from "next/navigation";
import { Building2, CalendarDays, QrCode, ScanFace } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const points = [
  { icon: Building2, title: "Acervos da organização", text: "Igrejas, escolas, empresas, estúdios e eventos organizam todas as fotos num só lugar." },
  { icon: CalendarDays, title: "Eventos com prazo", text: "Abra um evento por um período definido. O acesso público encerra sozinho." },
  { icon: QrCode, title: "Link e QR Code", text: "Quem participou acessa pelo celular, sem cadastro e sem pagar nada." },
  { icon: ScanFace, title: "Busca por selfie", text: "Cada pessoa encontra as próprias fotos em segundos, entre milhares." },
];

export default async function Home() {
  if (await getSession()) redirect("/painel");
  return (
    <div className="min-h-screen bg-nf-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size={28} />
        <Button href="/entrar" variant="ghost" size="sm">Entrar</Button>
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-nf-text sm:text-5xl">
          Cada pessoa encontra suas fotos com uma simples selfie.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-nf-muted">
          O NossaFoto transforma grandes acervos de fotografias em experiências inteligentes para a sua organização e para quem participa dela.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/criar-conta" size="lg">Criar conta da organização</Button>
          <Button href="/entrar" variant="secondary" size="lg">Já tenho conta</Button>
        </div>
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.title} className="rounded-nf-lg border border-nf-line bg-nf-surface p-5">
                <Icon size={20} className="text-nf-accent" aria-hidden />
                <h2 className="mt-4 font-semibold text-nf-text">{p.title}</h2>
                <p className="mt-1 text-sm text-nf-muted">{p.text}</p>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
