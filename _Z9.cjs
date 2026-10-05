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
console.log("✅ copy atomic _PAGE-FINALE.tsx.txt -> page.tsx");

const page = fs.readFileSync(DST, "utf8");
const api = fs.readFileSync(path.join(ROOT, "src/lib/wov-api.ts"), "utf8");

console.log("\n=== 1/3 SOURCE ===");
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
  ["NO h-full in avatar-box", () => {
    const m = page.match(/widthPct \* scale[\s\S]{0,400}?<\/div>/);
    return m ? !/h-full/.test(m[0]) : false;
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

console.log("\n=== 3/3 BUNDLE ===");
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
console.log("🎉 TUTTO OK — source, build, bundle — VERDE");
console.log("============================================");
console.log("");
console.log("ADESSO FAI COSÌ:");
console.log("  1) CHIUDI TUTTI I TAB VS CODE CHE CONTENGONO page.tsx / wov-api.ts !!!");
console.log("     (è quello il vero problema: IDE buffer sporco che mi sovrascrive ogni volta)");
console.log("  2) git add -A");
console.log("  3) git status  → devi vedere src/app/wolvesville/page.tsx e src/lib/wov-api.ts modificati ✅");
console.log("  4) git commit -m \"feat(wov): pack category, scala slider 20-150, download PNG 3x diretto\"");
console.log("  5) git push origin main");
console.log("  6) Vai → https://github.com/N0CTURA/Hub/actions attendi workflow verde");
console.log("  7) Apri → https://n0ctura.github.io/Hub/wolvesville → Ctrl+F5 hard refresh");
console.log("");
console.log("CHECKLIST LIVE ATTESA:");
console.log("  ✅ Prima icona sx = Pack (inventory_tab_pack.png)");
console.log("  ✅ Download toolbar = SOLO bottone 3x (no 1x, no 2x)");
console.log("  ✅ Click 3x = scarica PNG come file (NON apre nuova scheda)");
console.log("  ✅ Impostazioni → Scala avatar slider 20-150% + preset 50/70/85/100");
process.exit(0);
