import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-nf border border-nf-line bg-nf-surface px-3.5 text-[15px] text-nf-text placeholder:text-nf-subtle outline-none transition-[border-color,box-shadow] focus:border-nf-accent focus:shadow-nf-focus disabled:bg-nf-sunken disabled:text-nf-muted";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn("mb-1.5 block text-sm font-medium text-nf-text", props.className)}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "resize-none py-2.5", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-nf-subtle"
      />
    </div>
  );
}

/** Rótulo + controle + dica, já ligados por id para leitores de tela. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-describedby": hintId })}
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-nf-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
