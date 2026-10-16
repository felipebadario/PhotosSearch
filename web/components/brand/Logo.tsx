import { cn } from "@/lib/cn";

/** Símbolo do NossaFoto: uma lente com o ponto de "encontrado". */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" fill="#16171a" />
      <circle cx="15" cy="17" r="6.5" fill="none" stroke="#ffffff" strokeWidth="2.6" />
      <circle cx="23.5" cy="8.5" r="2.6" fill="#a5a1ff" />
    </svg>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span
        className="font-semibold tracking-[-0.03em] text-nf-text"
        style={{ fontSize: size * 0.62 }}
      >
        NossaFoto
      </span>
    </span>
  );
}
