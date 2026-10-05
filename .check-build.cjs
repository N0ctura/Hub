const fs = require("fs");
const js = fs.readFileSync(
  "out/_next/static/chunks/app/wolvesville/page-042b259a731ed974.js",
  "utf8",
);
const checks = {
  VECCHIO: [
    ["1x piccola", "testo download originale"],
    ["2x nitida", "testo download originale 2"],
    ["h-full", "AvatarPreview aveva h-full (bug aspect ratio)"],
    ['target="_blank"', "download che apriva in nuova scheda"],
  ],
  NUOVO: [
    ["isSkinPack", "flag categoria pack"],
    ["equipSkinPack", "funzione equipaggia skin pack"],
    ["download PNG diretto", "testo sotto bottoni NUOVO"],
    ["3x qualit", "solo 3x testo"],
    ["Cerca pacchetti skin", "placeholder pack"],
    ["Nessun pacchetto trovato", "empty state pack"],
    ["createObjectURL", "download fetch+blob"],
    ["wov_avatar_scale", "localStorage key scala"],
    ['min":20', "slider scala min"],
    ['max":150', "slider scala max"],
  ],
};
console.log("==== CHECK BUNDLE WOLVESVILLE ====\n");
for (const [label, arr] of Object.entries(checks)) {
  console.log(label + ":");
  for (const [needle, desc] of arr) {
    const ok = js.includes(needle);
    console.log((ok ? " ✅" : " ❌") + " " + desc.padEnd(42) + " (" + needle + ")");
  }
  console.log();
}
