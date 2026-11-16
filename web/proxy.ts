import { NextResponse, type NextRequest } from "next/server";

/**
 * A área interna da equipe NossaFoto fica em /manager, em qualquer domínio do app.
 * Se um dia o subdomínio manager.* for ligado, cada caminho dele é servido pelas
 * mesmas rotas de /manager (manager.exemplo.com/organizacoes → /manager/organizacoes).
 */

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  if (host.startsWith("manager.")) {
    if (pathname === "/manager" || pathname.startsWith("/manager/")) {
      return NextResponse.redirect(new URL(pathname.replace(/^\/manager/, "") || "/", req.url));
    }
    const url = req.nextUrl.clone();
    url.pathname = `/manager${pathname === "/" ? "" : pathname}`;
    const headers = new Headers(req.headers);
    headers.set("x-nf-manager-host", "1");
    return NextResponse.rewrite(url, { request: { headers } });
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
