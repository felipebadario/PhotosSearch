import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "NossaFoto Manager", template: "%s · NossaFoto Manager" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function ManagerRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-nf-canvas">{children}</div>;
}
