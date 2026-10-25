// Salvataggio di un'immagine/blob sul dispositivo dell'utente.
//
// Il download parte SEMPRE direttamente (nessun pannello di anteprima), anche su
// iPhone/iPad: Safari iOS 13+ rispetta <a download> per i blob.

/** Download classico tramite <a download>. */
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

/**
 * Scarica un'immagine remota. Se il CDN non permette di leggerla (CORS) si ricade
 * su un link diretto: il browser la scarica o la apre al posto della pagina.
 */
export async function downloadRemote(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    downloadBlob(await response.blob(), filename);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
