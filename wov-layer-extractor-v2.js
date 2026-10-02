/* =========================================================================
   WOLVESVILLE — ESTRATTORE COORDINATE UFFICIALI DEI LAYER  (v2)
   Compatibile con:
     • Editor Avatar  (preview principale)
     • Inventario      (seconda preview — più piccola, DOM diverso)
     • Profilo / Card (preview del personaggio sulla card)
   ========================================================================= */
(function () {
  const LOG = (t, data) => console.log("%c " + t + " ", "background:#ff2d78;color:#fff;font-weight:bold;padding:2px 6px", data || "");
  const DBG = (t, data) => console.log("%c " + t + " ", "background:#9475cd;color:#fff;font-size:10px", data || "");
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

  // ------------------------------------------------------------------
  // 0 — Trova TUTTE le immagini che potrebbero essere un layer avatar
  //     (vari tipi di preview = URL diverse)
  // ------------------------------------------------------------------
  const ALL = [...document.querySelectorAll("img")];
  DBG("Immagini nel DOM:", ALL.length);

  const candidates = ALL.filter((i) => {
    const s = (i.currentSrc || i.src || "").toLowerCase();
    return (
      s.includes("avatar-large") ||
      s.includes("avataritems") ||
      s.includes("bodypaints") ||
      s.includes("/hair/") || s.includes("/eyes/") || s.includes("/hat/") ||
      s.includes("/mouth/") || s.includes("/shirt/") || s.includes("/legs/") ||
      s.includes("/mask/") || s.includes("/glasses/") || s.includes("/badge/") ||
      s.includes("/front/") || s.includes("/back/") ||
      s.includes("/store.") && (s.includes(".png") || s.includes(".webp"))
    );
  });
  LOG("Candidates (immagini che assomigliano a layer):", candidates.length);

  if (!candidates.length) {
    // Debug: prime 15 immagini per capire la struttura
    console.groupCollapsed("🐛 DEBUG - Primi 15 src nel DOM");
    ALL.slice(0, 15).forEach((i, k) => console.log(k, (i.currentSrc || i.src).slice(0, 200)));
    console.groupEnd();
    return;
  }

  // ------------------------------------------------------------------
  // 1 — Cerca lo "stage" (contenitore che raccoglie TUTTI i layer)
  //     La preview piccola dell'inventario ha stage piccolissimo.
  // ------------------------------------------------------------------
  function findStage(els) {
    // antenato comune più vicino
    const pathOf = (el) => {
      const path = [];
      let n = el;
      while (n && n !== document.documentElement) { path.push(n); n = n.parentElement; }
      return path;
    };
    const paths = els.map(pathOf);
    for (const a of paths[0]) {
      if (paths.every(p => p.includes(a))) return a;
    }
    return null;
  }

  // Seleziona la preview GRANDE (per area) se ce ne sono più d'una
  const byStageArea = new Map();
  candidates.forEach((img) => {
    const st = findStage([img]) || img.parentElement;
    if (!st) return;
    const r = st.getBoundingClientRect();
    const area = r.width * r.height;
    // ignora stage piccolissimi (< 2000 px²) — sono le icone della griglia
    if (area < 2500) return;
    if (!byStageArea.has(st)) byStageArea.set(st, { area, imgs: [] });
    byStageArea.get(st).imgs.push(img);
  });

  if (!byStageArea.size) {
    LOG("❌ Nessun stage con abbastanza pixel trovato. Debug:");
    candidates.slice(0, 20).forEach((i) => {
      const r = i.getBoundingClientRect();
      console.log("  ", Math.round(r.width), "x", Math.round(r.height), "→", (i.currentSrc||"").split("/").pop());
    });
    return;
  }

  const stageArr = [...byStageArea.entries()].sort((a, b) => b[1].area - a[1].area);
  const [ stage, info ] = stageArr[0];
  const stageImgs = info.imgs;
  const stageRect = stage.getBoundingClientRect();
  LOG(`Stage scelto: ${Math.round(stageRect.width)} × ${Math.round(stageRect.height)} px  (${stageImgs.length} layer dentro)`);

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
    const u = url.toLowerCase();
    if (/bodypaints|\/body\/|\/head\/|\/mouth-/.test(u)) {
      if (/head-|\/head\//.test(u)) return "bp-head";
      if (/mouth-|\/mouth\//.test(u)) return "bp-mouth";
      return "bp-body";
    }
    if (/inventory_tab/.test(u)) return "category-icon";
    if (/\/hair\//) return "hair";
    if (/\/hat\//) return "hat";
    if (/\/glasses\//) return "glasses";
    if (/\/mask\//) return "mask";
    if (/\/eyes\//) return "eyes";
    if (/\/mouth\//) return "mouth";
    if (/\/shirt\//) return "shirt";
    if (/\/legs\//) return "legs";
    if (/\/badge\//) return "badge";
    if (/\/front\//) return "front";
    if (/\/back\//) return "back";
    return null;
  }

  // ------------------------------------------------------------------
  // 2 — Per ogni layer, estrae TUTTO
  // ------------------------------------------------------------------
  const layers = [];
  stageImgs.forEach((img, idx) => {
    const url = img.currentSrc || img.src;
    const r = img.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) return;     // scarta i pixel trasparenti residui
    const css = boxStyle(img);
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    // estrae ID dalla URL
    let id = null;
    const m = url.match(/\/([^/@\s?]+)\/avatar-large|\/([^/@\s?]+)\/\d+\/avataritems|\/([^/@\s?]+)\/(?:mouth|head|body)-|\/([^/@\s?]+)\/hair\/|\/([^/@\s?]+)\/(?:hat|eyes|glasses|mask|shirt|legs|badge|front|back)\//i);
    if (m) id = m[1] || m[2] || m[3] || m[4] || m[5];
    if (!id) id = url.split("/").pop().split("?")[0].replace(/(^@|\.store\..*|@\d+x.*$)/g, "").slice(0, 30);

    const stageX = r.x - stageRect.x;
    const stageY = r.y - stageRect.y;
    const stageW = stageRect.width;
    const stageH = stageRect.height;
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
      px: {
        x: Math.round(stageX),
        y: Math.round(stageY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
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

  layers.sort((a, b) => (a.css.zIndex || 0) - (b.css.zIndex || 0));

  // ------------------------------------------------------------------
  // 3 — Report + copia
  // ------------------------------------------------------------------
  const report = {
    time: new Date().toISOString(),
    context: "inventory-preview",
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
    compact: layers.map((L) => ({
      id: L.id,
      cat: L.inferredCategory,
      W_pct: L.pct.width,
      H_pct: L.pct.height,
      Bot_pct: L.pct.bottom,
      LeftC_pct: L.pct.leftCenterOffset,
      imgAsp: L.naturalSize.aspect,
      z: L.css.zIndex,
    })),
  };

  console.groupCollapsed("🐺 WOV - LAYERS RILEVATI");
  console.table(report.compact);
  console.groupEnd();
  console.groupCollapsed("🐺 Stage rilevato");
  console.log(report.stage);
  console.groupEnd();
  LOG("Riepilogo veloce (Ctrl+V il JSON copiato in chat)", report.compact);
  COPY(report);
  return report;
})();
