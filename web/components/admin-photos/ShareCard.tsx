import { headers } from "next/headers";
import QRCode from "qrcode";
import { Download, ExternalLink, Link2, Lock } from "lucide-react";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { setSharingAction } from "@/lib/actions/sharing";
import { CopyLinkButton } from "./CopyLinkButton";

/** Endereço público do acervo neste deploy (em produção, nossafoto.app). */
async function publicUrl(orgSlug: string, collectionSlug: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "nossafoto.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/${orgSlug}/${collectionSlug}`;
}

export async function ShareCard({
  collectionId,
  collectionSlug,
  orgSlug,
  shared,
  closed,
  canEdit,
}: {
  collectionId: string;
  collectionSlug: string;
  orgSlug: string;
  shared: boolean;
  closed: boolean;
  canEdit: boolean;
}) {
  const url = await publicUrl(orgSlug, collectionSlug);
  const qr = shared ? await QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M", color: { dark: "#16171a", light: "#ffffff" } }) : null;

  return (
    <section aria-labelledby="compartilhar" className="rounded-nf-lg border border-nf-line bg-nf-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="compartilhar" className="text-lg font-semibold text-nf-text">Link e QR Code</h2>
        {shared ? <Badge tone={closed ? "warning" : "success"}>{closed ? "Encerrado" : "Aberto por link"}</Badge> : <Badge>Privado</Badge>}
      </div>

      {!shared && (
        <div className="mt-3">
          <p className="flex items-start gap-2 text-sm text-nf-muted">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            Só os membros da organização veem estas fotos. Ao abrir por link, quem tiver o link ou o QR Code vê todas as fotos deste acervo, sem precisar de conta.
          </p>
          {canEdit && (
            <form action={setSharingAction} className="mt-4">
              <input type="hidden" name="collectionId" value={collectionId} />
              <input type="hidden" name="shared" value="1" />
              <SubmitButton pendingLabel="Abrindo...">Abrir por link e gerar QR Code</SubmitButton>
            </form>
          )}
        </div>
      )}

      {shared && qr && (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR Code que abre ${url}`} width={176} height={176} className="h-44 w-44 shrink-0 self-center rounded-nf border border-nf-line sm:self-start" />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-nf-muted">
              {closed
                ? "O evento passou do prazo de disponibilidade: quem abrir o link vê o aviso de encerrado, sem fotos."
                : "Quem abrir este link ou apontar a câmera para o QR Code vê todas as fotos deste acervo, sem precisar de conta."}
            </p>
            <p className="flex items-center gap-2 break-all rounded-nf bg-nf-sunken px-3 py-2.5 text-sm text-nf-text">
              <Link2 size={15} className="shrink-0 text-nf-muted" aria-hidden />
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <CopyLinkButton url={url} />
              <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "sm")}>
                <ExternalLink size={15} aria-hidden /> Abrir página
              </a>
              <a href={qr} download={`qrcode-${collectionSlug}.png`} className={buttonClasses("secondary", "sm")}>
                <Download size={15} aria-hidden /> Baixar QR Code
              </a>
            </div>
            {canEdit && (
              <form action={setSharingAction} className="border-t border-nf-line pt-3">
                <input type="hidden" name="collectionId" value={collectionId} />
                <input type="hidden" name="shared" value="0" />
                <SubmitButton size="sm" variant="ghost" pendingLabel="Fechando...">Tornar privado de novo</SubmitButton>
                <p className="mt-1 text-xs text-nf-subtle">O link e o QR Code param de funcionar na hora e voltam a valer se você abrir de novo.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
