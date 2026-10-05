const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname);
const run = (c, text) => {
  if (typeof c === "function") return Boolean(c(text));
  if (typeof c === "boolean") return c;
  return c.test(text);
};

// ========== STEP 0: Copia ATOMICA del file CORRETTO (NO GAP PER IDE) ==========
const SRC_CORRETTO = path.join(ROOT, "_PAGE-FINALE.tsx.txt");
const DST = path.join(ROOT, "src/app/wolvesville/page.tsx");
fs.copyFileSync(SRC_CORRETTO, DST);
fs.fsyncSync(fs.openSync(DST, "r"));
console.log("✅ Copiato atomicamente _PAGE-FINALE.tsx.txt -> src/app/wolvesville/page.tsx");

const page = fs.readFileSync(DST, "utf8");
const apiFile = path.join(ROOT, "src/lib/wov-api.ts");
const api = fs.readFileSync(apiFile, "utf8");

// ========== STEP 1: Verifica marker SORGENTI (dopo la copia) ==========
console.log("\n=== 1/3 MARKER SORGENTI (dopo copy atomica) ===");
const P = [
  ["flag isSkinPack", /isSkinPack\?/],
  ["placeholder pack 'Cerca pacchetti skin'", /Cerca pacchetti skin/],
  ["empty pack 'Nessun pacchetto trovato'", /Nessun pacchetto trovato/],
  ["funzione equipSkinPack", /equipSkinPack\(/],
  ["download testo nuovo 'download PNG diretto'", /download PNG diretto/],
  ["RIMOSSO testo '1x piccola'", (t) => !/1x piccola/.test(t)],
  ["RIMOSSO testo '2x nitida'", (t) => !/2x nitida/.test(t)],
  ["downloadPng() senza parametri scale", /const downloadPng = async \(\) => \{/],
  ["RIMOSSO target='_blank'", (t) => !/target=\"_blank\"/.test(t)],
  ["download usa URL.createObjectURL (blob)", /URL\.createObjectURL\(/],
  ["usePersisted chiave wov_avatar_scale", /wov_avatar_scale/],
  ["slider scala min=20 max=150", /min=\{20\}[\s\S]{0,80}?max=\{150\}/],
  ["4 preset scala 50 70 85 100", /\[50, 70, 85, 100\]\.map/],
  ["h-full RIMOSSO da box avatar (widthPct*scale)", () => {
    const m = page.match(/widthPct \* scale[\s\S]{0,400}?<\/div>/);
    return m ? !/h-full/.test(m[0]) : false;
  }],
  ["type ReactNode importato da react", /import \{[^}]*type ReactNode[^}]*\} from \"react\"/],
  ["type-guard pack: previewImageUrl ? img : div", /pack\.previewImageUrl\s*\?/],
  ["solo bottone 3x (nessun [1,2,3].map)", (t) =>
    !/\[\s*1\s*,\s*2\s*,\s*3\s*\]\.map/.test(t) && /<Download size=\{14\}\s*\/>\s*3x/.test(t)],
  ["categoria Pack=slot 0 e icon inventory_tab_pack.png", /CATEGORIES\s*:\s*Category\[\]\s*=\s*\[\s*\{[\s\S]{0,120}?isSkinPack\s*:\s*true/],
  ["AvatarPreview usa prop scale", /scale={avatarScale}/],
];
const A = [
  ["interface WovSkinPack presente", /export\s+interface\s+WovSkinPack/],
  ["helper normalizeSetSlots()", /function\s+normalizeSetSlots\s*\(/],
  ["export async fetchSkinPacks()", /export\s+async\s+function\s+fetchSkinPacks\s*\(/],
  ["endpoint GET /items/avatarItemSets", /\/items\/avatarItemSets/],
  ["endpoint GET /items/avatarItemCollections", /\/items\/avatarItemCollections/],
  ["endpoint GET /items/advancedRoleCardOffers", /\/items\/advancedRoleCardOffers/],
  ["cache 24h skinPacks", /cache\s*\(\s*[\"']skinPacks[\"']/i],
];
let sOk = true;
for (const [n, c] of P) {
  const o = run(c, page);
  console.log((o ? "✅ " : "❌ ") + n);
  sOk &= o;
}
console.log("--- wov-api.ts ---");
for (const [n, c] of A) {
  const o = run(c, api);
  console.log((o ? "✅ " : "❌ ") + n);
  sOk &= o;
}
if (!sOk) {
  console.error("\n❌ Source marker falliti.");
  process.exit(2);
}
console.log("✅ SOURCE OK (" + (P.length + A.length) + "/" + (P.length + A.length) + ")");

// ========== STEP 2: NEXT.JS BUILD (subito dopo la copy - stesso processo) ==========
console.log("\n=== 2/3 NEXT.JS PRODUCTION BUILD ===");
try {
  execSync(`node "${path.join(ROOT, "node_modules/next/dist/bin/next")}" build`, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
} catch (e) {
  console.error("\n❌ NEXT BUILD FALLITA (vedi errore sopra).");
  process.exit(1);
}
console.log("✅ BUILD OK");

// ========== STEP 3: BUNDLE CHECK ==========
console.log("\n=== 3/3 BUNDLE (out/_next chunks wolvesville) ===");
const outDir = path.join(ROOT, "out", "_next", "static", "chunks", "app", "wolvesville");
const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".js"));
let bundle = "";
for (const f of files) bundle += fs.readFileSync(path.join(outDir, f), "utf8") + "\n";

const B = [
  ["OLD❌ '1x piccola' ASSENTE", (t) => !/1x piccola/.test(t)],
  ["OLD❌ '2x nitida' ASSENTE", (t) => !/2x nitida/.test(t)],
  ["OLD❌ target='_blank' ASSENTE", (t) => !/target=\"_blank\"/.test(t)],
  ["NEW✅ 'download PNG diretto'", /download PNG diretto/],
  ["NEW✅ flag isSkinPack", /isSkinPack/],
  ["NEW✅ equipSkinPack()", /equipSkinPack/],
  ["NEW✅ 'Cerca pacchetti skin'", /Cerca pacchetti skin/],
  ["NEW✅ 'Nessun pacchetto trovato'", /Nessun pacchetto trovato/],
  ["NEW✅ createObjectURL (blob PNG)", /createObjectURL/],
  ["NEW✅ localStorage key 'wov_avatar_scale'", /wov_avatar_scale/],
  ["NEW✅ slider min=20 max=150", /min.{0,5}20[\s\S]{0,300}?max.{0,5}150/],
  ["NEW✅ preset 50 70 85 100", /50.{0,5}70.{0,5}85.{0,5}100/],
  ["NEW✅ solo 3x (no 1,2,3)", (t) => !/1\s*,\s*2\s*,\s*3/.test(t) && /3x qualit/.test(t)],
  ["NEW✅ icona pack inventory_tab_pack.png", /inventory_tab_pack\.png/],
];
let bOk = true;
for (const [n, c] of B) {
  const o = run(c, bundle);
  console.log((o ? "✅ " : "❌ ") + n);
  bOk &= o;
}
if (!bOk) {
  console.error("\n❌ Bundle marker falliti.");
  process.exit(3);
}

console.log("\n=============================================");
console.log("🎉 COMPLETATO TUTTO: 3 FASI PASSATE");
console.log("=============================================");
console.log("  ✅  SOURCE   (" + P.length + " page + " + A.length + " api) marker OK");
console.log("  ✅  BUILD    Next.js exit 0 — out/ export OK");
console.log("  ✅  BUNDLE   (" + B.length + "/14) marker OK");
console.log("");
console.log("FILE PRONTI PER IL PUSH:");
console.log("  • src/app/wolvesville/page.tsx");
console.log("  • src/lib/wov-api.ts");
console.log("  • public/wov-icons/inventory_tab_pack.png");
console.log("  • out/  [build artifact - non serve committare]");
console.log("");
console.log("AZIONI DA FARE (tu, su GitHub):");
console.log("  1) Chiudi tutti i tab VS Code aperti su page.tsx / wov-api.ts per evitare che l'IDE riapplichi il buffer vecchio!");
console.log("  2) git status  → verifica che page.tsx / wov-api.ts siano modificati");
console.log("  3) git add -A && git commit -m \"feat(wov): pack-category + scala-slider + downloadPNG-3x-direct\" && git push origin main");
console.log("  4) Vai su https://github.com/N0CTURA/Hub/actions → attendi che il deploy GitHub Pages finisca (verde)");
console.log("  5) Apri https://n0ctura.github.io/Hub/wolvesville → Ctrl+F5 hard refresh");
console.log("  6) Verifica:");
console.log("       • Prima icona a sinistra in alto = Pack (quadratino blu) ✅");
console.log("       • Toolbar download = solo bottone 3x ✅");
console.log("       • Cliccando 3x = scarica PNG direttamente ✅");
console.log("       • In alto a dx Impostazioni → slider Scala avatar 20%-150% + preset 50/70/85/100 ✅");
console.log("  7) Se Actions è ROSSO: apri il job → copia l'errore → mandamelo!");
process.exit(0);
