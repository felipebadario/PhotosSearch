import { NextResponse, type NextRequest } from "next/server";

/**
 * manager.nossafoto.app é a área interna da equipe NossaFoto. O mesmo app atende
 * os dois domínios: no subdomínio, cada caminho é servido pelas rotas de /manager.
 * No domínio principal, /manager leva para o subdomínio. Em localhost e nos
 * previews da Vercel (sem subdomínio), /manager abre direto para testar.
 */
const MANAGER_HOST = "manager.nossafoto.app";
const MAIN_HOSTS = new Set(["nossafoto.app", "www.nossafoto.app"]);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname, search } = req.nextUrl;

  if (host === MANAGER_HOST || host.startsWith("manager.")) {
    if (pathname === "/manager" || pathname.startsWith("/manager/")) {
      return NextResponse.redirect(new URL(pathname.replace(/^\/manager/, "") || "/", req.url));
    }
    const url = req.nextUrl.clone();
    url.pathname = `/manager${pathname === "/" ? "" : pathname}`;
    const headers = new Headers(req.headers);
    headers.set("x-nf-manager-host", "1");
    return NextResponse.rewrite(url, { request: { headers } });
  }

  if (MAIN_HOSTS.has(host) && (pathname === "/manager" || pathname.startsWith("/manager/"))) {
    return NextResponse.redirect(`https://${MANAGER_HOST}${pathname.replace(/^\/manager/, "") || "/"}${search}`);
  }
  // Ninguém de fora manda este cabeçalho para o app principal.
  if (req.headers.has("x-nf-manager-host")) {
    const headers = new Headers(req.headers);
    headers.delete("x-nf-manager-host");
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|icon.svg|favicon.ico|instagram/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|zip)$).*)"],
};
