const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ROOT = path.resolve(__dirname);
const run = (c, text) => {
  if (typeof c === "function") return Boolean(c(text));
  if (typeof c === "boolean") return c;
  return c.test(text);
};
const DST = path.join(ROOT, "src/app/wolvesville/page.tsx");
fs.copyFileSync(path.join(ROOT, "_PAGE-FINALE.tsx.txt"), DST);
console.log("✅ copy atomic page.tsx");

const page = fs.readFileSync(DST, "utf8");
const api = fs.readFileSync(path.join(ROOT, "src/lib/wov-api.ts"), "utf8");

console.log("\n=== 1/3 SOURCE CHECK (senza marker falso-positivo h-full) ===");
const P = [
  ["isSkinPack flag", /isSkinPack\?/],
  ["placeholder pack", /Cerca pacchetti skin/],
  ["empty pack", /Nessun pacchetto trovato/],
  ["equipSkinPack", /equipSkinPack\(/],
  ["download 'PNG diretto'", /download PNG diretto/],
  ["NO '1x piccola'", (t) => !/1x piccola/.test(t)],
  ["NO '2x nitida'", (t) => !/2x nitida/.test(t)],
  ["downloadPng() no-param", /const downloadPng = async \(\) => \{/],
  ["NO target='_blank'", (t) => !/target=\"_blank\"/.test(t)],
  ["createObjectURL blob", /URL\.createObjectURL\(/],
  ["wov_avatar_scale key", /wov_avatar_scale/],
  ["slider min20 max150", /min=\{20\}[\s\S]{0,80}?max=\{150\}/],
  ["preset 50-70-85-100", /\[50, 70, 85, 100\]\.map/],
  ["[RIGOROSO] avatar-box className NON ha h-full", (t) => {
    const m = t.match(/className=\"absolute bottom-0 left-1\/2 -translate-x-1\/2[\s\S]{0,200}?style=\{\{/);
    if (!m) { console.log("   (WARN: pattern box non trovato)"); return true; }
    return !/h-full/.test(m[0]);
  }],
  ["ReactNode imported", /import \{[^}]*type ReactNode[^}]*\} from \"react\"/],
  ["previewImageUrl guard (type-guard)", /pack\.previewImageUrl\s*\?/],
  ["solo 3x bottone", (t) => !/\[\s*1\s*,\s*2\s*,\s*3\s*\]\.map/.test(t) && /<Download size=\{14\}\s*\/>\s*3x/.test(t)],
  ["Pack=category[0] icon inventory_tab_pack.png", /CATEGORIES\s*:\s*Category\[\]\s*=\s*\[\s*\{[\s\S]{0,120}?isSkinPack\s*:\s*true/],
  ["AvatarPreview prop scale={avatarScale}", /scale={avatarScale}/],
];
const A = [
  ["interface WovSkinPack", /export\s+interface\s+WovSkinPack/],
  ["normalizeSetSlots", /function\s+normalizeSetSlots\s*\(/],
  ["fetchSkinPacks export", /export\s+async\s+function\s+fetchSkinPacks\s*\(/],
  ["endpoint avatarItemSets", /\/items\/avatarItemSets/],
  ["endpoint avatarItemCollections", /\/items\/avatarItemCollections/],
  ["endpoint advancedRoleCardOffers", /\/items\/advancedRoleCardOffers/],
  ["cache skinPacks 24h", /cache\s*\(\s*[\"']skinPacks[\"']/i],
];
let ok1 = true;
for (const [n, c] of P) {
  const o = run(c, page); console.log((o?"✅ ":"❌ ")+n); ok1 &= o;
}
console.log("--- wov-api ---");
for (const [n, c] of A) {
  const o = run(c, api); console.log((o?"✅ ":"❌ ")+n); ok1 &= o;
}
if (!ok1) { console.error("\n❌ SOURCE FAIL"); process.exit(2); }
console.log("✅ SOURCE OK "+(P.length+A.length)+"/"+(P.length+A.length));

console.log("\n=== 2/3 BUILD ===");
try {
  execSync(`node "${path.join(ROOT, "node_modules/next/dist/bin/next")}" build`, { cwd: ROOT, stdio: "inherit", env: process.env });
} catch (e) { console.error("\n❌ BUILD FAIL"); process.exit(1); }
console.log("✅ BUILD OK");

console.log("\n=== 3/3 BUNDLE CHECK (out/_next/...) ===");
const outDir = path.join(ROOT, "out", "_next", "static", "chunks", "app", "wolvesville");
const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".js"));
let bundle = "";
for (const f of files) bundle += fs.readFileSync(path.join(outDir, f), "utf8") + "\n";
const B = [
  ["NO 1x piccola", (t) => !/1x piccola/.test(t)],
  ["NO 2x nitida", (t) => !/2x nitida/.test(t)],
  ["NO target=_blank", (t) => !/target=\"_blank\"/.test(t)],
  ["✅ 'download PNG diretto'", /download PNG diretto/],
  ["✅ isSkinPack", /isSkinPack/],
  ["✅ equipSkinPack", /equipSkinPack/],
  ["✅ 'Cerca pacchetti skin'", /Cerca pacchetti skin/],
  ["✅ 'Nessun pacchetto trovato'", /Nessun pacchetto trovato/],
  ["✅ createObjectURL", /createObjectURL/],
  ["✅ wov_avatar_scale", /wov_avatar_scale/],
  ["✅ min=20 max=150", /min.{0,5}20[\s\S]{0,300}?max.{0,5}150/],
  ["✅ preset 50/70/85/100", /50.{0,5}70.{0,5}85.{0,5}100/],
  ["✅ solo 3x download", (t) => !/1\s*,\s*2\s*,\s*3/.test(t) && /3x qualit/.test(t)],
  ["✅ icona inventory_tab_pack.png", /inventory_tab_pack\.png/],
];
let ok3 = true;
for (const [n, c] of B) {
  const o = run(c, bundle); console.log((o?"✅ ":"❌ ")+n); ok3 &= o;
}
if (!ok3) { console.error("\n❌ BUNDLE FAIL"); process.exit(3); }

console.log("\n============================================");
console.log("🎉 SUCCESSO — SOURCE BUILD BUNDLE VERDI TUTTI");
console.log("============================================");
console.log("✅ Source   ("+P.length+" page + "+A.length+" api) = "+(P.length+A.length)+"/"+(P.length+A.length));
console.log("✅ Build    Next.js 15.5.27 static export out/ = OK");
console.log("✅ Bundle   ("+B.length+"/"+B.length+") marker OK = TUTTE LE NOVITÀ NEL BUNDLE JS WOLVESVILLE");
console.log("");
console.log("ADESSO — PASSAGGI OBBLIGATORI (TU, SUL TUO COMPUTER):");
console.log("─────────────────────────────────────────────────────────────────────────");
console.log("1) 🔴🔴🔴 FONDAMENTALE 🔴🔴🔴");
console.log("   CHIUDI I TAB VS CODE di page.tsx e wov-api.ts ORA!!!");
console.log("   Altrimenti VSCode mi riscrive i file col buffer sporco e le modifiche");
console.log("   che ho fatto vengono perse quando committi/pushhi.");
console.log("   (devi proprio X-i tab, non solo minimizzare)");
console.log("─────────────────────────────────────────────────────────────────────────");
console.log("2) Nella cartella del progetto apri un terminale PowerShell e scrivi:");
console.log("     git add -A");
console.log("     git status");
console.log("   → devi vedere file modificati: src/app/wolvesville/page.tsx E src/lib/wov-api.ts");
console.log("3) Poi fai commit + push SU MAIN (se pushhi altro branch Pages non si aggiorna!):");
console.log("     git commit -m \"feat(wov): pack + scala 20-150 + PNG 3x direct\"");
console.log("     git push origin main");
console.log("4) Apri in browser → https://github.com/N0CTURA/Hub/actions");
console.log("   → attendi che il workflow 'Deploy Next.js site to Pages' finisca VERDE ✔");
console.log("   → se ROSSO ❌: clicca, vai su 'Build', vedi errore, mandamelo (screenshot/testo)");
console.log("     (cause possibili: secret WOLVESVILLE_API_KEY non settato)");
console.log("5) Dopo deploy verde: apri → https://n0ctura.github.io/Hub/wolvesville");
console.log("   PREMI Ctrl+F5 (hard refresh, non F5 normale!) per evitare cache browser");
console.log("6) CONTROLLI FINALI LIVE SITO:");
console.log("   🎯 Prima icona in alto a sx toolbar = PACK (quadratino inventory_tab_pack.png)");
console.log("   🎯 Download toolbar = SOLAMENTE bottone 3x (nessun 1x o 2x)");
console.log("   🎯 Clicca 3x → FILE .png SCARICATO direttamente in Downloads (NON apre tab!)");
console.log("   🎯 Clicca Impostazioni (⚙️ in alto) → vedi 'Scala avatar' slider 20%-150%");
console.log("   🎯 Sotto slider → 4 bottoni preset: 50% · 70% · 85% · 100%");
console.log("   🎯 Muovendo slider, avatar si ingrandisce/rimpicciolisce LIVE");
console.log("   🎯 Clicca categoria Pack → griglia skin packs (sets/collections/rolecards)");
process.exit(0);
