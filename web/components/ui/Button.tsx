import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-df-primary text-df-white hover:bg-df-primary-dark hover:-translate-y-0.5 hover:shadow-df-soft active:translate-y-0",
  secondary:
    "bg-df-white text-df-primary border border-df-line hover:border-df-primary/40 hover:-translate-y-0.5 hover:shadow-df-card active:translate-y-0",
  ghost: "text-df-ink hover:bg-df-mint-soft",
  danger:
    "bg-df-danger text-df-white hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
};

const sizes: Record<Size, string> = {
  md: "text-sm px-5 py-2.5",
  sm: "text-xs px-3.5 py-2",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkButtonProps = CommonProps & { href: string; target?: string };

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps | LinkButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href) {
    const { href, target } = props;
    return (
      <Link href={href} target={target} className={classes}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon}
      {children}
    </button>
  );
}
