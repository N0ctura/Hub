// Salvataggio di un'immagine/blob sul dispositivo dell'utente.
//
// Il problema dei dispositivi Apple:
//  - Safari iOS puo' ignorare un <a download> cliccato DOPO operazioni
//    asincrone lunghe (il "gesto utente" scade);
//  - navigator.share({files}) richiede un gesto utente fresco.
// Soluzione: su iOS/iPadOS NON scarichiamo in automatico, ma mostriamo un
// pannello con l'anteprima + pulsante "Salva / Condividi" (gesto fresco) e
// l'immagine tenibile premuta ("Salva in Foto"). Sugli altri dispositivi il
// download parte direttamente.

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ si presenta come "Macintosh" ma ha il touch
  const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  return iOS || iPadOS;
}

/** Download classico tramite <a download>. Va chiamato in un click handler. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari ha bisogno di tempo prima di poter revocare l'URL
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export type ShareResult = "shared" | "cancelled" | "unsupported";

/** Foglio di condivisione nativo (su iPhone offre "Salva immagine"). */
export async function shareBlob(blob: Blob, filename: string): Promise<ShareResult> {
  try {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return "unsupported";
    }
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
      return "unsupported";
    }
    await navigator.share({ files: [file], title: filename });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}
