import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { MessageCircle } from "lucide-react";
import { getAlbum } from "@/lib/api/albums";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyLinkButton } from "@/components/albums/CopyLinkButton";

export default async function AlbumSharingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  if (!album.isPublic) {
    return (
      <EmptyState
        title="Publique o álbum para compartilhar"
        description="O link e o QR Code ficam disponíveis assim que o álbum estiver publicado."
      />
    );
  }

  const publicUrl = `https://descomplicafotos.com/comunidade-vida-nova/${album.slug}`;
  const qrSvg = await QRCode.toString(publicUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#153d33", light: "#00000000" },
  });
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Encontre suas fotos de "${album.name}": ${publicUrl}`,
  )}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
      <Card>
        <CardBody className="space-y-5 pt-6">
          <div>
            <h3 className="font-display text-lg font-bold text-df-ink">
              Compartilhe seu álbum
            </h3>
            <p className="mt-1 text-sm text-df-muted">
              Qualquer pessoa com este link encontra as próprias fotos com uma selfie —
              sem precisar criar conta.
            </p>
          </div>
          <div className="rounded-xl border border-df-line bg-df-cream px-4 py-3">
            <p className="break-all font-mono text-sm text-df-ink">{publicUrl}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CopyLinkButton url={publicUrl} />
            <Button variant="secondary" href={whatsappHref} target="_blank" icon={<MessageCircle size={16} />}>
              Compartilhar no WhatsApp
            </Button>
            <Button variant="ghost" href={publicUrl} target="_blank">
              Abrir página pública
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="flex flex-col items-center p-6">
        <div
          className="h-40 w-40 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="mt-3 text-center text-xs text-df-muted">
          Use em telões, materiais impressos ou credenciais do evento.
        </p>
      </Card>
    </div>
  );
}
