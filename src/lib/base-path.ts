// Su GitHub Pages il sito vive sotto "/Hub" (vedi next.config.mjs).
// Next.js aggiunge il prefisso solo ai suoi link: gli asset di public/ scritti
// a mano ("/images/x.webp") vanno prefissati, altrimenti danno 404 online.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const EXTERNAL = /^(https?:|data:|blob:)/i;

/**
 * Restituisce un URL valido per un asset locale o remoto.
 * - URL esterni, data: e blob: restano invariati
 * - percorsi che iniziano con "/" ricevono il basePath (una volta sola)
 * - gli spazi nei nomi file vengono codificati ("La Foca.png" -> "La%20Foca.png")
 */
export function withBase(src: string | null | undefined): string {
  if (!src) return "";
  if (EXTERNAL.test(src)) return src;
  if (!src.startsWith("/")) return src;

  let path = src;
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) {
    path = path.slice(BASE_PATH.length);
  }
  try {
    path = encodeURI(decodeURI(path));
  } catch {
    path = encodeURI(path);
  }
  return `${BASE_PATH}${path}`;
}
