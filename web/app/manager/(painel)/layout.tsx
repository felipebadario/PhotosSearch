import { ManagerNav } from "@/components/manager/ManagerNav";
import { db } from "@/lib/server/db";
import { managerBase, requireTeam } from "@/lib/server/manager";
import { countLeadsByStatus } from "@/lib/server/repos/leads";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeam();
  const [base, counts] = await Promise.all([managerBase(), countLeadsByStatus(db)]);
  return (
    <>
      <ManagerNav base={base} userName={user.name} newLeads={counts.new} />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
    </>
  );
}
