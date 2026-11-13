import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/LeadForm";
import { db } from "@/lib/server/db";
import { LEAD_PLANS, LEAD_PLAN_LABEL, LEAD_SOURCES } from "@/lib/server/repos/leads";
import { getUsage } from "@/lib/server/repos/photos";
import { getTenant } from "@/lib/server/session";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Quero assinar",
  description: "Conte sobre sua organização e a equipe do NossaFoto monta o plano com você.",
};

const pick = <T extends string>(list: readonly T[], v: unknown) => (list as readonly string[]).includes(String(v)) ? (String(v) as T) : undefined;

export default async function AssinarPage({ searchParams }: PageProps<"/assinar">) {
  const { plano, origem } = await searchParams;
  const tenant = await getTenant();
  const usage = tenant ? await getUsage(db, tenant) : null;
  const source = pick(LEAD_SOURCES, origem) ?? "site";
  const full = usage?.limit != null && usage.used >= usage.limit;

  return (
    <>
      <h1 className="text-2xl font-semibold text-nf-text">Assine o NossaFoto</h1>
      <p className="mb-6 mt-1.5 text-[15px] text-nf-muted">
        Conte um pouco sobre sua organização. Nossa equipe fala com você para escolher o plano certo e combinar o pagamento.
      </p>
      {usage && usage.limit != null && (
        <p className="mb-6 rounded-nf bg-nf-sunken px-3.5 py-3 text-sm text-nf-muted">
          {full ? "Sua organização chegou ao limite" : "Sua organização usa"}{" "}
          <span className="font-medium text-nf-text">
            {formatNumber(usage.used)} de {formatNumber(usage.limit)} fotos
          </span>{" "}
          do plano {usage.name}. {full && "Enquanto conversamos, as fotos já enviadas continuam funcionando normalmente."}
        </p>
      )}
      <LeadForm
        plans={LEAD_PLANS.map((p) => ({ value: p, label: LEAD_PLAN_LABEL[p] }))}
        defaults={{
          name: tenant?.user.name,
          email: tenant?.user.email,
          organizationName: tenant?.organization.name,
          plan: pick(LEAD_PLANS, plano),
          source,
          loggedIn: Boolean(tenant),
        }}
      />
    </>
  );
}
