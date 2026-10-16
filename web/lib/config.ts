export const SITE_URL = "https://nossafoto.app";
export const SITE_HOST = "nossafoto.app";

/** Endereço público de um álbum compartilhado. */
export function publicAlbumUrl(handle: string, albumSlug: string) {
  return `${SITE_URL}/${handle}/${albumSlug}`;
}

/** Caminho interno (relativo) da página pública, para abrir dentro do próprio deploy. */
export function publicAlbumPath(handle: string, albumSlug: string) {
  return `/${handle}/${albumSlug}`;
}
