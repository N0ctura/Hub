const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname);

const run = (c, text) => {
  if (typeof c === "function") return Boolean(c(text));
  if (typeof c === "boolean") return c;
  return c.test(text);
};

const page = fs.readFileSync(path.join(ROOT, "src/app/wolvesville/page.tsx"), "utf8");
const api = fs.readFileSync(path.join(ROOT, "src/lib/wov-api.ts"), "utf8");

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
  ["h-full rimosso da box avatar (aspect-ratio)", () => {
    const m = page.match(/widthPct \* scale[\s\S]{0,400}?<\/div>/);
    return m ? !/h-full/.test(m[0]) : false;
  }],
  ["type ReactNode importato da react", /import \{[^}]*type ReactNode[^}]*\} from \"react\"/],
  ["type-guard pack previewImageUrl ? ... :", /pack\.previewImageUrl \s*\?/],
  ["solo bottone 3x (nessun [1,2,3].map)", (t) =>
    !/\[\s*1\s*,\s*2\s*,\s*3\s*\]\.map/.test(t) && /3x\s*<\/button\s*>/.test(t)],
  ["categoria Pack in posizione 0 (primo slot)", /CATEGORIES\s*:\s*Category\[\]\s*=\s*\[\s*\{[\s\S]{0,120}?isSkinPack\s*:\s*true/],
];

const A = [
  ["interface WovSkinPack presente", /export\s+interface\s+WovSkinPack/],
  ["helper normalizeSetSlots()", /function\s+normalizeSetSlots\s*\(/],
  ["export async fetchSkinPacks()", /export\s+async\s+function\s+fetchSkinPacks\s*\(/],
  ["endpoint GET /items/avatarItemSets", /\/items\/avatarItemSets/],
  ["endpoint GET /items/avatarItemCollections", /\/items\/avatarItemCollections/],
  ["endpoint GET /items/advancedRoleCardOffers", /\/items\/advancedRoleCardOffers/],
  ["cache skinPacks (24h)", /cache\s*\(\s*[\"']skinPacks[\"']/i],
];

console.log("=== 1/3 MARKER SORGENTI ===");
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
  console.error("\n❌ Source MARKER FALLITI. Fix page.tsx / wov-api.ts.");
  process.exit(2);
}
console.log("✅ TUTTI I SORGENTI OK");

console.log("\n=== 2/3 NEXT.JS PRODUCTION BUILD ===");
try {
  execSync(`node "${path.join(ROOT, "node_modules/next/dist/bin/next")}" build`, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
} catch (e) {
  console.error("\n❌ NEXT BUILD FALLITA (vedi errore TS sopra).");
  process.exit(1);
}
console.log("✅ BUILD OK");

console.log("\n=== 3/3 BUNDLE (out/_next/ chunks app/wolvesville) ===");
const outDir = path.join(ROOT, "out", "_next", "static", "chunks", "app", "wolvesville");
const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".js"));
let bundle = "";
for (const f of files) bundle += fs.readFileSync(path.join(outDir, f), "utf8") + "\n";

const B = [
  ["[NO VECCHIO] testo '1x piccola' ASSENTE", (t) => !/1x piccola/.test(t)],
  ["[NO VECCHIO] testo '2x nitida' ASSENTE", (t) => !/2x nitida/.test(t)],
  ["[NO VECCHIO] target='_blank' ASSENTE", (t) => !/target=\"_blank\"/.test(t)],
  ["[NUOVO] testo 'download PNG diretto'", /download PNG diretto/],
  ["[NUOVO] flag isSkinPack", /isSkinPack/],
  ["[NUOVO] equipSkinPack()", /equipSkinPack/],
  ["[NUOVO] placeholder 'Cerca pacchetti skin'", /Cerca pacchetti skin/],
  ["[NUOVO] empty 'Nessun pacchetto trovato'", /Nessun pacchetto trovato/],
  ["[NUOVO] createObjectURL (blob PNG)", /createObjectURL/],
  ["[NUOVO] localStorage key 'wov_avatar_scale'", /wov_avatar_scale/],
  ["[NUOVO] slider scala min=20 max=150", /min.{0,5}20[\s\S]{0,300}?max.{0,5}150/],
  ["[NUOVO] preset scala 50,70,85,100", /50.{0,5}70.{0,5}85.{0,5}100/],
  ["[NUOVO] solo 3x (no 1,2,3 map)", (t) => !/1\s*,\s*2\s*,\s*3/.test(t) && /3x qualit/.test(t)],
  ["[NUOVO] categoria pack icon inventory_tab_pack.png", /inventory_tab_pack\.png/],
];

let bOk = true;
for (const [n, c] of B) {
  const o = run(c, bundle);
  console.log((o ? "✅ " : "❌ ") + n);
  bOk &= o;
}
if (!bOk) {
  console.error("\n❌ Bundle MARKER FALLITI (controlla che non siano codice vecchio).");
  process.exit(3);
}

console.log("\n=====================================================");
console.log("🎉 SUCCESSO TOTALE: ");
console.log("   ✅ SORGENTI (page.tsx + wov-api.ts) 18+7 marker OK");
console.log("   ✅ BUILD Next.js exit 0 · static export out/ OK");
console.log("   ✅ BUNDLE out/_next chunks wolvesville 14 marker OK");
console.log("=====================================================");
console.log("Ora puoi fare:");
console.log("   git add -A && git commit -m \"feat(wov): pack+scala+downloadPNG\" && git push origin main");
console.log("Poi attendi deploy GitHub Actions e Ctrl+F5 hard refresh sul sito LIVE");
process.exit(0);
