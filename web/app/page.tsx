import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  Download,
  EyeOff,
  FolderSync,
  ImageUp,
  Images,
  Library,
  Lock,
  QrCode,
  ScanFace,
  Smartphone,
  Timer,
  UserRoundX,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Audiences } from "@/components/landing/Audiences";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PlanEstimator } from "@/components/landing/PlanEstimator";
import { SelfieDemo } from "@/components/landing/SelfieDemo";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "NossaFoto — cada pessoa encontra suas fotos com uma selfie" },
  description:
    "Para igrejas, escolas, eventos, fotógrafos e empresas: organize acervos de fotos e deixe cada participante se encontrar com uma selfie, por link ou QR Code, sem cadastro.",
};

const features = [
  { icon: ImageUp, title: "Envio direto", text: "Arraste centenas de fotos de uma vez. Se mandar de novo, as que já estão lá são puladas." },
  { icon: FolderSync, title: "Pastas do Google Drive", text: "Cole o link de uma pasta compartilhada. Cada subpasta vira um álbum e as novas fotos chegam sozinhas." },
  { icon: Images, title: "Álbuns", text: "Separe culto, cerimônia, festa ou turma, e encontre qualquer foto rápido no Admin." },
  { icon: Copy, title: "Fotos repetidas contam uma vez", text: "A mesma foto em vários acervos ocupa um lugar só no seu plano." },
  { icon: CalendarClock, title: "Eventos com prazo", text: "Defina até quando a página fica aberta. Depois disso, ela encerra sozinha." },
  { icon: QrCode, title: "Link e QR Code", text: "Gere o QR Code em um clique e baixe para o telão, o convite ou o crachá." },
  { icon: Download, title: "Download sob controle", text: "Você decide se quem participa pode baixar as fotos ou só ver." },
  { icon: Users, title: "Equipe com papéis", text: "Convide quem ajuda a cuidar das fotos, com o nível de acesso certo para cada um." },
];

const privacy = [
  { icon: ScanFace, title: "A selfie não fica guardada", text: "Ela serve só para aquela busca e é descartada em seguida." },
  { icon: Users, title: "Cada pessoa vê só as próprias fotos", text: "Quem abre o link não vê a galeria do evento. Só aparecem as fotos em que a selfie encontrou a pessoa." },
  { icon: Lock, title: "A busca fica dentro do acervo", text: "Ninguém procura um rosto em todo o NossaFoto, só nas fotos daquele evento ou acervo." },
  { icon: EyeOff, title: "Fora dos buscadores", text: "As páginas de fotos não aparecem no Google. Só chega quem tem o link ou o QR Code." },
  { icon: Timer, title: "Prazo para acabar", text: "Eventos encerram na data definida, e você pode fechar o link quando quiser." },
  { icon: UserRoundX, title: "Sem cadastro de participante", text: "Quem procura as fotos não cria conta e não deixa e-mail nem telefone." },
];

const faq = [
  {
    q: "Quem participa precisa baixar um aplicativo ou criar conta?",
    a: "Não. A pessoa abre o link ou lê o QR Code com a câmera do celular, tira uma selfie e vê as fotos em que aparece. Funciona no navegador.",
  },
  {
    q: "Quem participa paga alguma coisa?",
    a: "Nunca. Quem paga é a organização que guarda as fotos, pelo volume de fotos (Business) ou por evento (Events).",
  },
  {
    q: "Quem abre o link vê todas as fotos do evento?",
    a: "Não. A página do link não mostra a galeria. Cada pessoa tira uma selfie e vê só as fotos em que aparece. A galeria completa fica com a equipe da organização.",
  },
  {
    q: "O que acontece com a selfie?",
    a: "Ela é usada só para aquela busca, dentro daquele acervo, e não fica guardada. As páginas também ficam fora dos buscadores.",
  },
  {
    q: "Minhas fotos já estão no Google Drive. Preciso enviar de novo?",
    a: "Não. Compartilhe a pasta como “Qualquer pessoa com o link” e cole o link no acervo. Cada subpasta vira um álbum, e o NossaFoto confere novas fotos a cada 30 minutos.",
  },
  {
    q: "Qual a diferença entre acervo e evento?",
    a: "O acervo permanente guarda fotos ao longo do tempo, como os cultos de uma igreja ou a memória de uma escola. O evento tem data para abrir e para encerrar, como uma formatura ou um congresso.",
  },
  {
    q: "E se a mesma foto estiver em mais de um acervo?",
    a: "Ela conta uma vez só no seu plano. O NossaFoto reconhece fotos repetidas, mesmo com outro nome de arquivo.",
  },
  {
    q: "Quanto custa?",
    a: "Criar a conta da organização não tem custo e já dá para guardar até 1.000 fotos. Para ir além, peça a assinatura em nossafoto.app/assinar e nossa equipe monta o plano com você.",
  },
];

export default async function Home() {
  if (await getSession()) redirect("/painel");
  const qrSvg = await QRCode.toString("https://nossafoto.app", {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#16171a", light: "#ffffff" },
  });

  return (
    <div className="min-h-screen bg-nf-canvas">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-nf focus:bg-nf-surface focus:px-4 focus:py-2 focus:shadow-nf-float"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />

      <main id="conteudo">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:pb-24">
          <div className="animate-nf-rise">
            <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-nf-text sm:text-6xl">
              Você esteve lá.
              <br />
              Agora encontre as suas fotos.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-nf-muted">
              O NossaFoto organiza os acervos de fotos da sua organização e deixa cada pessoa se encontrar neles com uma selfie. Por link ou QR Code, sem cadastro e sem custo para quem participa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/criar-conta" size="lg" icon={<ArrowRight size={18} aria-hidden />} className="flex-row-reverse">
                Criar conta da organização
              </Button>
              <Button href="#como-funciona" variant="secondary" size="lg">
                Ver como funciona
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-nf-muted">
              {["Participantes nunca pagam", "Sem app e sem login", "A selfie não fica guardada"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={16} className="text-nf-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <SelfieDemo />
        </section>

        {/* O problema */}
        <section aria-labelledby="problema" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-28">
          <h2 id="problema" className="sr-only">Antes e depois</h2>
          <BeforeAfter />
        </section>

        {/* Como funciona */}
        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-20 border-y border-nf-line bg-nf-sunken/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <SectionHeading
              id="como-funciona-titulo"
              eyebrow="Como funciona"
              title="Três passos, do cartão de memória ao celular de cada pessoa."
              text="Quem organiza faz o mesmo trabalho de sempre. O NossaFoto cuida do resto."
            />
            <div className="mt-12">
              <HowItWorks qrSvg={qrSvg} />
            </div>
          </div>
        </section>

        {/* Para quem */}
        <section id="para-quem" aria-labelledby="para-quem-titulo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-8 sm:py-28">
          <SectionHeading
            id="para-quem-titulo"
            eyebrow="Para quem é"
            title="Feito para quem guarda as fotos de muita gente."
            text="Escolha o seu caso e veja como o NossaFoto se encaixa."
          />
          <div className="mt-10">
            <Audiences />
          </div>
        </section>

        {/* Acervo ou evento */}
        <section aria-labelledby="formatos" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-28">
          <h2 id="formatos" className="sr-only">Acervo permanente ou evento</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormatCard
              icon={<Library size={20} aria-hidden />}
              title="Acervo permanente"
              text="Guarda as fotos ao longo do tempo e fica sempre disponível. Para a memória de uma igreja, escola ou empresa."
              timeline={["Jan", "Mar", "Jun", "Set", "Dez"]}
              open
            />
            <FormatCard
              icon={<CalendarClock size={20} aria-hidden />}
              title="Evento"
              text="Abre numa data e encerra sozinho no prazo que você escolher. Para formaturas, casamentos e congressos."
              timeline={["Abre", "Evento", "Busca", "Encerra"]}
            />
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" aria-labelledby="recursos-titulo" className="scroll-mt-20 border-y border-nf-line bg-nf-surface py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <SectionHeading
              id="recursos-titulo"
              eyebrow="Recursos"
              title="Tudo o que a sua equipe precisa para cuidar das fotos."
            />
            <ul className="mt-12 grid gap-px overflow-hidden rounded-nf-lg border border-nf-line bg-nf-line sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.title} className="group bg-nf-surface p-6 transition-colors hover:bg-nf-canvas">
                    <span className="flex h-10 w-10 items-center justify-center rounded-nf bg-nf-sunken text-nf-text transition-colors group-hover:bg-nf-ink group-hover:text-white">
                      <Icon size={18} aria-hidden />
                    </span>
                    <h3 className="mt-5 font-semibold text-nf-text">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-nf-muted">{f.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Privacidade */}
        <section id="privacidade" aria-labelledby="privacidade-titulo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <SectionHeading
                id="privacidade-titulo"
                eyebrow="Privacidade"
                title="Rosto é dado sensível. Tratamos assim."
                text="A busca por selfie só existe porque a organização abriu o acervo para isso. E ela foi desenhada para guardar o mínimo possível."
              />
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-nf-muted">
                <Smartphone size={16} aria-hidden /> Tudo explicado na própria tela de busca, antes da selfie.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {privacy.map((p, i) => {
                const Icon = p.icon;
                return (
                  <li key={p.title} className={i < 2 ? "rounded-nf-lg border border-nf-accent/25 bg-nf-accent-soft/50 p-5 sm:col-span-2" : "rounded-nf-lg border border-nf-line bg-nf-surface p-5"}>
                    <Icon size={18} className={i < 2 ? "text-nf-accent" : "text-nf-muted"} aria-hidden />
                    <h3 className="mt-3 font-semibold text-nf-text">{p.title}</h3>
                    <p className="mt-1 text-sm text-nf-muted">{p.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" aria-labelledby="planos-titulo" className="scroll-mt-20 border-y border-nf-line bg-nf-sunken/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <SectionHeading
              id="planos-titulo"
              eyebrow="Planos"
              title="Quem guarda as fotos paga. Quem procura, nunca."
              text="Assinatura pelo volume de fotos para quem tem acervo, ou pagamento por evento para quem faz um de cada vez."
            />
            <div className="mt-12">
              <PlanEstimator />
            </div>
          </div>
        </section>

        {/* Perguntas */}
        <section id="perguntas" aria-labelledby="perguntas-titulo" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-8 sm:py-28">
          <SectionHeading id="perguntas-titulo" eyebrow="Perguntas frequentes" title="Ainda com dúvida?" center />
          <div className="mt-10 divide-y divide-nf-line rounded-nf-lg border border-nf-line bg-nf-surface">
            {faq.map((f) => (
              <details key={f.q} className="group px-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-nf-text [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nf-sunken text-nf-muted transition-transform duration-200 group-open:rotate-45" aria-hidden>
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </span>
                </summary>
                <p className="-mt-1 pb-5 text-[15px] text-nf-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Chamada final */}
        <section aria-labelledby="cta" className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-28">
          <div className="flex flex-col items-start gap-8 rounded-nf-xl bg-nf-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="cta" className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Seu próximo evento pode terminar com cada pessoa levando as próprias fotos.</h2>
              <p className="mt-3 text-white/75">Crie a conta da organização e monte o primeiro acervo em poucos minutos.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
              <Button href="/criar-conta" variant="secondary" size="lg" className="border-transparent">Criar conta da organização</Button>
              <Button href="/entrar" size="lg" className="bg-white/10 hover:bg-white/15">Já tenho conta</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-nf-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Logo size={24} />
            <p className="mt-2 text-sm text-nf-muted">Cada pessoa encontra suas fotos com uma simples selfie.</p>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-nf-muted">
            <a href="#como-funciona" className="hover:text-nf-text">Como funciona</a>
            <a href="#planos" className="hover:text-nf-text">Planos</a>
            <Link href="/assinar" className="hover:text-nf-text">Assinar</Link>
            <a href="https://instagram.com/nossafoto.app" target="_blank" rel="noopener noreferrer" className="hover:text-nf-text">Instagram</a>
            <Link href="/entrar" className="hover:text-nf-text">Entrar</Link>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-nf-muted sm:px-8">© {new Date().getFullYear()} NossaFoto</p>
      </footer>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, text, center }: { id: string; eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : "max-w-2xl"}>
      <p className="text-sm font-medium text-nf-accent">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-semibold leading-tight text-nf-text sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-nf-muted">{text}</p>}
    </div>
  );
}

function FormatCard({ icon, title, text, timeline, open }: { icon: React.ReactNode; title: string; text: string; timeline: string[]; open?: boolean }) {
  return (
    <div className="group rounded-nf-xl border border-nf-line bg-nf-surface p-6 transition-colors hover:border-nf-line-strong sm:p-8">
      <span className="flex h-11 w-11 items-center justify-center rounded-nf bg-nf-sunken text-nf-text">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold text-nf-text">{title}</h3>
      <p className="mt-1.5 text-[15px] text-nf-muted">{text}</p>
      <div className="mt-8" aria-hidden>
        <div className="relative h-1.5 rounded-full bg-nf-sunken">
          <div
            className={
              open
                ? "absolute inset-y-0 left-0 w-full rounded-full bg-nf-ink"
                : "absolute inset-y-0 left-[12%] w-[64%] rounded-full bg-nf-ink transition-[width] duration-500 group-hover:w-[76%]"
            }
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-nf-muted">
          {timeline.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
