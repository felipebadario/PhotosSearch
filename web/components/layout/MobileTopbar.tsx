import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";

export function MobileTopbar({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-nf-line bg-nf-canvas/90 px-4 backdrop-blur-md md:hidden">
      <Link href="/" aria-label="NossaFoto, início" className="rounded-nf">
        <Logo size={26} />
      </Link>
      <Link href="/conta" aria-label="Minha conta" className="rounded-full">
        <Avatar name={userName} size={32} />
      </Link>
    </header>
  );
}
