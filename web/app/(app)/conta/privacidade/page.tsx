import type { Metadata } from "next";
import { EyeOff, Lock, ScanFace, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Privacidade" };

const PRINCIPLES = [
  {
    icon: EyeOff,
    title: "Sua selfie não fica salva",
    text: "A foto usada numa busca serve só para aquela busca e é descartada logo em seguida.",
  },
  {
    icon: Lock,
    title: "A busca acontece só no seu acervo",
    text: "Suas fotos nunca são comparadas com fotos de outras pessoas, e não existe busca na internet.",
  },
  {
    icon: ScanFace,
    title: "Nada de identidade global",
    text: "O NossaFoto não cria um perfil do seu rosto que siga você entre acervos diferentes.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-4">
      <Card>
        <ul className="divide-y divide-nf-line">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="flex gap-4 p-5 sm:p-6">
              <p.icon size={20} className="mt-0.5 shrink-0 text-nf-text" aria-hidden />
              <div>
                <h2 className="text-[15px] font-medium text-nf-text">{p.title}</h2>
                <p className="mt-1 text-sm text-nf-muted">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <Trash2 size={20} className="mt-0.5 shrink-0 text-nf-danger" aria-hidden />
            <div>
              <h2 className="text-[15px] font-medium text-nf-text">Apagar meus dados</h2>
              <p className="mt-1 text-sm text-nf-muted">
                Remove fotos, álbuns e tudo o que foi preparado para a busca. Disponível quando
                houver contas com login.
              </p>
            </div>
          </div>
          <Button variant="danger" disabled>
            Apagar dados
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
