import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-nf bg-nf-danger-soft px-3.5 py-3 text-sm text-nf-danger">
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
