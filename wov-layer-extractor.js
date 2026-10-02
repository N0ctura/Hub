/* =========================================================================
   WOLVESVILLE — ESTRATTORE COORDINATE UFFICIALI DEI LAYER
   Da incollare nella Console (F12) di wolvesville.com mentre sei nell'
   editor Avatar con la preview visibile e l'avatar attrezzato.
   Esegui una volta per ogni outfit diverso che vuoi campionare.
   ========================================================================= */
(function () {
  const LOG = (t, data) => console.log("%c " + t + " ", "background:#ff2d78;color:#fff;font-weight:bold;padding:2px 6px", data || "");
  const COPY = (obj) => {
    try {
      copy(JSON.stringify(obj, null, 2));
      LOG("✅ JSON copiato negli Appunti — incollalo in chat");
    } catch (e) {
      LOG("⚠️ copy() non disponibile, scarica il file JSON");
      const b = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "wov-avatar-layers-" + Date.now() + ".json";
      a.click();
    }
  };

  // 0 — Cerca tutti i layer dell'avatar nell'anteprima
  //    (nel gioco sono tutti <img src="...avatar-large@...store...")
  const imgs = [...document.querySelectorAll("img")].filter(i => {
    const s = i.currentSrc || i.src || "";
    return /avatar-large|avatarItems\/.*\.store|bodyPaints/.test(s);
  });
  if (!imgs.length) {
    LOG("❌ Nessun immagine avatar trovata. Sei nell'editor avatar con l'anteprima visibile?");
    LOG("   Se la console è in 'top', cambia frame nel menu in alto a sx.");
    return;
  }
  LOG("Trovati " + imgs.length + " immagini nell'anteprima");

  // 1 — Cerca il "palco" (contenitore) dell'avatar:
  //     l'antenato comune più vicino a tutte le immagini che ha
  //     position: relative o absolute e le contiene tutte.
  function findStage(els) {
    const ancestors = new Map();
    const pathOf = (el) => {
      const path = [];
      let n = el;
      while (n && n !== document.documentElement) { path.push(n); n = n.parentElement; }
      return path;
    };
    const paths = els.map(pathOf);
    // intersection comune più vicina
    for (const a of paths[0]) {
      if (paths.every(p => p.includes(a))) return a;
    }
    return null;
  }

  const stage = findStage(imgs) || imgs[0].parentElement;
  const stageRect = stage.getBoundingClientRect();

  function boxStyle(el) {
    const s = getComputedStyle(el);
    return {
      width: parseFloat(s.width),
      height: parseFloat(s.height),
      top: parseFloat(s.top),
      left: parseFloat(s.left),
      right: parseFloat(s.right),
      bottom: parseFloat(s.bottom),
      position: s.position,
      zIndex: s.zIndex === "auto" ? 0 : +s.zIndex,
      transform: s.transform,
      margin: s.margin,
      padding: s.padding,
    };
  }

  function inferCategoryFromSrc(url) {
    // Wolvesville inserisce il tipo nella URL o nel nome del file
    if (/bodyPaints|head-|body-|mouth-/.test(url)) {
      if (/head-/.test(url)) return "bp-head";
      if (/mouth-/.test(url)) return "bp-mouth";
      return "bp-body";
    }
    if (/inventory_tab/.test(url)) return "category-icon";
    return null;
  }

  // 2 — Per ogni immagine, estrai:
  //     - ID item (dalla url: .../ID/avatar-large@...)
  //     - posizione relativa allo stage, percentuale e pixel
  //     - dimensioni naturali e renderizzate
  const layers = [];
  imgs.forEach((img, idx) => {
    const url = img.currentSrc || img.src;
    const r = img.getBoundingClientRect();
    const css = boxStyle(img);
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    // estrae ID dalla URL: .../ID/avatar-large@Nx.store.png
    let id = null;
    const m = url.match(/\/([^/@]+)\/avatar-large|\/([^/@]+)\/\d+\/avatarItems|\/(hair-[^/@]+)\/(?:mouth|head|body)-/);
    if (m) id = m[1] || m[2] || m[3];
    // Se non va, prendi il nome del file
    if (!id) id = url.split("/").pop();

    const stageX = r.x - stageRect.x;
    const stageY = r.y - stageRect.y;
    const stageW = stageRect.width;
    const stageH = stageRect.height;

    // Posizione in percentuale dal BOTTOM e dal LEFT (come serve al nostro renderer)
    const bottomPct = ((stageRect.bottom - (r.y + r.height)) / stageH) * 100;
    const leftPct = (stageX / stageW) * 100;
    const leftCenterPct = leftPct + ((r.width / 2) / stageW) * 100 - 50;
    const widthPct = (r.width / stageW) * 100;
    const heightPct = (r.height / stageH) * 100;
    const aspect = natW / Math.max(1, natH);

    layers.push({
      idx,
      url: url.split("?")[0],
      id,
      inferredCategory: inferCategoryFromSrc(url),
      // pixel assoluti rispetto allo stage
      px: {
        x: Math.round(stageX),
        y: Math.round(stageY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      // percentuali sullo stage (come dobbiamo usare in CSS)
      pct: {
        bottom: +(bottomPct).toFixed(3),
        left: +(leftPct).toFixed(3),
        leftCenterOffset: +(leftCenterPct).toFixed(3),
        width: +(widthPct).toFixed(3),
        height: +(heightPct).toFixed(3),
      },
      naturalSize: { w: natW, h: natH, aspect: +aspect.toFixed(4) },
      css,
    });
  });

  // Ordina per z-index così corrisponde all'ordine di rendering
  layers.sort((a, b) => (a.css.zIndex || 0) - (b.css.zIndex || 0));

  // 3 — Output finale
  const report = {
    time: new Date().toISOString(),
    viewport: {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio,
    },
    stage: {
      px: {
        x: Math.round(stageRect.x),
        y: Math.round(stageRect.y),
        w: Math.round(stageRect.width),
        h: Math.round(stageRect.height),
      },
      css: boxStyle(stage),
    },
    nLayers: layers.length,
    layers,
    // I dati che ci servono VERAMENTE per allineare il nostro renderer
    // in formato compatto: una riga per layer
    compact: layers.map((L) => ({
      id: L.id,
      cat: L.inferredCategory,
      W_pct: L.pct.width,
      Bot_pct: L.pct.bottom,
      CenterOff_pct: L.pct.leftCenterOffset,
      imgAsp: L.naturalSize.aspect,
      z: L.css.zIndex,
    })),
  };

  console.groupCollapsed("🐺 WOV - LAYERS RILEVATI");
  console.table(report.compact);
  console.groupEnd();
  console.groupCollapsed("🐺 Dettaglio stage");
  console.log(report.stage);
  console.groupEnd();
  LOG("Riepilogo veloce (id, width%, bottom%, aspect, z)", report.compact);
  COPY(report);
  return report;
})();
