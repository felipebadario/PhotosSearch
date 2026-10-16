import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-nf font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  primary: "bg-nf-ink text-white hover:bg-nf-ink-hover",
  secondary:
    "bg-nf-surface text-nf-text border border-nf-line hover:border-nf-line-strong hover:bg-nf-sunken/60",
  ghost: "text-nf-text hover:bg-nf-sunken",
  accent: "bg-nf-accent text-white hover:bg-nf-accent-hover",
  danger: "bg-nf-surface text-nf-danger border border-nf-line hover:bg-nf-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4.5 text-sm",
  lg: "h-13 px-6 text-base",
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

type LinkButtonProps = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps | LinkButtonProps) {
  const classes = buttonClasses(variant, size, className);

  if ("href" in props && props.href) {
    const { href, target, rel, ...rest } = props;
    return (
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
        className={classes}
        {...rest}
      >
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {icon}
      {children}
    </button>
  );
}
