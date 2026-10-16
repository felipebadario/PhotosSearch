import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ExternalLink, Link2, MessageCircle } from "lucide-react";
import { getAlbum } from "@/lib/api/albums";
import { getAccount } from "@/lib/api/account";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyLinkButton } from "@/components/albums/CopyLinkButton";
import { ShareToggle } from "@/components/albums/ShareToggle";
import { publicAlbumPath, publicAlbumUrl } from "@/lib/config";

export default async function AlbumSharePage({ params }: PageProps<"/acervo/albuns/[id]/compartilhar">) {
  const { id } = await params;
  const [album, account] = await Promise.all([getAlbum(id), getAccount()]);
  if (!album) notFound();

  if (!album.isPublic) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Link2 size={20} className="mt-0.5 shrink-0 text-nf-text" aria-hidden />
            <div>
              <h3 className="text-base font-semibold text-nf-text">Compartilhe com quem estava lá</h3>
              <p className="mt-1 max-w-md text-sm text-nf-muted">
                Crie um link para este álbum. Quem abrir tira uma selfie e encontra as próprias fotos,
                sem precisar criar conta. Você pode desativar o link quando quiser.
              </p>
            </div>
          </div>
          <ShareToggle albumId={album.id} isPublic={false} />
        </CardBody>
      </Card>
    );
  }

  const url = publicAlbumUrl(account.handle, album.slug);
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#16171a", light: "#00000000" },
  });
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Encontre suas fotos de "${album.name}" no NossaFoto: ${url}`,
  )}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-nf-text">Link do álbum</h3>
            <p className="mt-1 text-sm text-nf-muted">
              Quem abrir este link encontra as próprias fotos com uma selfie, sem criar conta.
            </p>
          </div>
          <p className="break-all rounded-nf bg-nf-sunken px-4 py-3 font-mono text-sm text-nf-text">{url}</p>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton url={url} />
            <Button variant="secondary" href={whatsappHref} target="_blank" icon={<MessageCircle size={16} aria-hidden />}>
              WhatsApp
            </Button>
            <Button
              variant="ghost"
              href={publicAlbumPath(account.handle, album.slug)}
              target="_blank"
              icon={<ExternalLink size={16} aria-hidden />}
            >
              Abrir página
            </Button>
          </div>
          <div className="border-t border-nf-line pt-5">
            <ShareToggle albumId={album.id} isPublic />
          </div>
        </CardBody>
      </Card>

      <Card className="flex flex-col items-center p-6">
        <div
          role="img"
          aria-label={`QR Code para ${url}`}
          className="h-44 w-44 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="mt-3 text-center text-xs text-nf-muted">
          Mostre na tela, imprima ou envie por mensagem.
        </p>
      </Card>
    </div>
  );
}
