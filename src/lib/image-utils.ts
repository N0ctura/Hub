// Ridimensiona e comprime un'immagine in un data URL leggero (evita di riempire il localStorage).
export function compressImage(
  file: File,
  maxSize = 256,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas non disponibile");
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = file.type === "image/png" || file.type === "image/gif";
        let out = canvas.toDataURL("image/webp", quality);
        if (!out.startsWith("data:image/webp")) {
          out = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
        }
        resolve(out);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("immagine non valida"));
    };
    img.src = url;
  });
}


// Ricomprime un data URL gia' salvato (migrazione delle vecchie foto enormi)
export function shrinkDataUrl(dataUrl: string, maxSize = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith("data:image")) return resolve(dataUrl);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL("image/webp", quality);
        if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/jpeg", quality);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
