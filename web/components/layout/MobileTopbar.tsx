import { Camera } from "lucide-react";

export function MobileTopbar() {
  return (
    <header className="flex items-center gap-2 border-b border-df-line bg-df-white px-4 py-3.5 md:hidden">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-df-primary text-df-white">
        <Camera size={15} strokeWidth={2.3} />
      </span>
      <span className="font-display text-sm font-bold text-df-ink">
        Descomplica <span className="text-df-accent-dark">Fotos</span>
      </span>
    </header>
  );
}
