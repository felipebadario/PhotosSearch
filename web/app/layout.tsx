import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nossafoto.app"),
  title: {
    default: "NossaFoto — encontre a foto que você procura",
    template: "%s · NossaFoto",
  },
  description:
    "Busca inteligente em grandes acervos de fotos. Encontre a foto que você procura, mesmo entre milhares.",
  applicationName: "NossaFoto",
  openGraph: {
    title: "NossaFoto",
    description: "Encontre a foto que você procura, mesmo entre milhares.",
    siteName: "NossaFoto",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f7f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-nf-canvas text-nf-text font-sans">
        {children}
      </body>
    </html>
  );
}
