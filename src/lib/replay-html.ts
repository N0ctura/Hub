import type { Tribute, SimulationLog } from "@/lib/game-types";

// Genera un file HTML autonomo (nessuna richiesta esterna) con il replay completo
// della partita, pensato per essere aperto da smartphone.

const CSS = `
:root{--bg:#0d0814;--card:#1a1226;--card2:#221833;--gold:#f2b632;--text:#f3eefa;--mut:#a79bbd;--red:#ef4a5a;--line:#2f2344}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth;scroll-padding-top:110px}
body{margin:0;background:#0d0814;background:radial-gradient(1200px 600px at 50% -200px,#2a1745 0,#0d0814 60%) fixed;color:var(--text);font:16px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;padding-bottom:env(safe-area-inset-bottom)}
.wrap{max-width:640px;margin:0 auto;padding:0 14px 40px}
header{padding:28px 0 10px;text-align:center}
h1{margin:0;font:700 22px Georgia,serif;letter-spacing:.04em;color:var(--gold)}
.sub{color:var(--mut);font-size:13px;margin-top:4px}
.hero{margin:16px 0;padding:22px 16px;text-align:center;border:1px solid #4b3512;border-radius:16px;background:rgba(242,182,50,.1)}
.hero .crown{font-size:30px;line-height:1}
.hero .big{width:104px;height:104px;margin:10px auto 8px;display:block;border-radius:50%;border:3px solid var(--gold);box-shadow:0 0 28px rgba(242,182,50,.35)}
.hero .nm{font:700 24px Georgia,serif}
.hero .kl{color:var(--mut);font-size:14px;margin-top:2px}
.chips{display:flex;gap:8px;justify-content:center;margin-top:12px}
.chip{flex:1;max-width:120px;padding:8px 6px;border-radius:12px;background:var(--card);border:1px solid var(--line);text-align:center}
.chip b{display:block;font-size:20px;color:var(--gold)}
.chip span{font-size:11px;color:var(--mut)}
.rd{position:absolute;opacity:0;pointer-events:none}
nav.tabs{position:sticky;top:0;z-index:5;background:#0d0814;background:rgba(13,8,20,.94);margin:0 -14px;padding:10px 14px 0;border-bottom:1px solid var(--line)}
.tabrow{display:flex;gap:6px}
.tab{flex:1;display:block;text-align:center;padding:10px 4px;border-radius:10px 10px 0 0;color:var(--mut);font:600 14px -apple-system,system-ui,sans-serif;cursor:pointer}
#t1:checked~nav label[for=t1],#t2:checked~nav label[for=t2],#t3:checked~nav label[for=t3]{color:var(--gold);background:var(--card);box-shadow:inset 0 -2px 0 var(--gold)}
.phases{display:none;gap:6px;overflow-x:auto;padding:8px 0;scrollbar-width:none}
.phases::-webkit-scrollbar{display:none}
#t1:checked~nav .phases{display:flex}
.pill{flex:0 0 auto;padding:6px 11px;border-radius:999px;background:var(--card);border:1px solid var(--line);color:var(--text);text-decoration:none;font-size:13px;white-space:nowrap}
.pane{display:none;padding-top:8px}
#t1:checked~.panes #pane-tl,#t2:checked~.panes #pane-dt,#t3:checked~.panes #pane-tr{display:block}
.tools{display:none;padding:10px 0 0}
.tools.js{display:block}
#t1:not(:checked)~.panes .tools{display:none}
select{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:15px}
.ph{margin:18px 0 8px;display:flex;align-items:center;gap:8px;font:700 17px Georgia,serif;color:var(--gold)}
.ph small{margin-left:auto;font:12px -apple-system,system-ui,sans-serif;color:var(--mut)}
.ev{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0}
.ev.fatal{border-left-color:var(--red);background:#2a1424;background:linear-gradient(90deg,rgba(239,74,90,.14),var(--card) 60%)}
.ev[hidden],.ph[hidden]{display:none}
.avs{display:flex;margin-bottom:7px}
.av{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;border:2px solid var(--card);margin-right:-8px;background:var(--card2) center/cover no-repeat;flex:none;font:700 12px -apple-system,system-ui,sans-serif;color:var(--mut);font-style:normal}
.av.dead,.pic.dead{filter:grayscale(1);opacity:.7}
.ev p{margin:0;font-size:15px}
.dl{margin-top:6px;font-size:12.5px;font-weight:700;color:var(--red);letter-spacing:.02em}
.row{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0}
.pic{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;border:2px solid var(--gold);flex:none;background:var(--card2) center/cover no-repeat;font:700 14px -apple-system,system-ui,sans-serif;color:var(--mut);font-style:normal}
.row.dead .pic{border-color:#555;filter:grayscale(1)}
.info{min-width:0;flex:1}
.n{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m{font-size:12.5px;color:var(--mut)}
.pos{font:700 15px Georgia,serif;color:var(--gold);min-width:30px;text-align:right}
.why{font-size:13px;color:var(--mut);margin-top:3px}
.empty{color:var(--mut);text-align:center;padding:30px 0}
footer{margin-top:24px;text-align:center;color:var(--mut);font-size:12px}
`;

// Solo miglioria progressiva: il replay si legge anche senza JavaScript (anteprime iOS/Discord)
const JS = `
(function(){
var sel=document.getElementById('flt');if(!sel)return;
var names={};
var evs=[].slice.call(document.querySelectorAll('.ev'));
evs.forEach(function(e){(e.getAttribute('data-p')||'').split(' ').forEach(function(id){if(id&&!names[id])names[id]=e.getAttribute('data-n-'+id)||''})});
var opts=[].slice.call(document.querySelectorAll('[data-tid]')).map(function(x){return [x.getAttribute('data-tid'),x.getAttribute('data-tname')]});
var seen={},html='<option value="">Tutti i tributi</option>';
opts.sort(function(a,b){return a[1].localeCompare(b[1])}).forEach(function(o){if(seen[o[0]])return;seen[o[0]]=1;html+='<option value="'+o[0]+'">'+o[1]+'</option>'});
sel.innerHTML=html;
document.getElementById('tools').className='tools js';
sel.onchange=function(){
  var f=sel.value;
  evs.forEach(function(e){e.hidden=!!f&&(' '+e.getAttribute('data-p')+' ').indexOf(' '+f+' ')<0});
  [].slice.call(document.querySelectorAll('.ph[data-ph]')).forEach(function(h){
    var any=false,n=h.nextElementSibling;
    while(n&&n.classList.contains('ev')){if(!n.hidden)any=true;n=n.nextElementSibling}
    h.hidden=!any;
  });
};
})();
`;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function buildReplayHtml(opts: {
  tributes: Tribute[];
  winner: Tribute | null;
  logs: SimulationLog[];
  title?: string;
}): string {
  const { tributes, winner, logs } = opts;
  const title = opts.title || "Hunger Games - Replay";
  const phaseLabel = (l: SimulationLog) =>
    l.phase === "day" ? `Giorno ${l.phaseNumber}` : l.phase === "night" ? `Notte ${l.phaseNumber}` : "Banchetto";
  const phaseIcon = (l: SimulationLog) => (l.phase === "day" ? "☀️" : l.phase === "night" ? "\u{1F319}" : "\u{1F37D}️");

  const byId = new Map(tributes.map((t) => [t.id, t]));
  const idx = new Map(tributes.map((t, i) => [t.id, i]));

  // Ordine di eliminazione -> posizione finale (1 = vincitore)
  const outOrder: { id: string; where: string }[] = [];
  for (const l of logs) for (const e of l.events) for (const id of e.deaths) outOrder.push({ id, where: phaseLabel(l) });
  const total = tributes.length;
  const pos = new Map<string, number>();
  const where = new Map<string, string>();
  outOrder.forEach((o, i) => {
    pos.set(o.id, total - i);
    where.set(o.id, o.where);
  });

  // Le foto vanno nel CSS una sola volta (classe .aN), non ripetute in ogni evento
  const imgCss = tributes
    .map((t, i) => (t.image ? `.a${i}{background-image:url("${t.image.replace(/"/g, "%22")}")}` : ""))
    .join("");
  const av = (id: string, cls: string, dead = false) => {
    const t = byId.get(id);
    if (!t) return "";
    const i = idx.get(id) as number;
    const c = `${cls}${dead ? " dead" : ""}${t.image ? ` a${i}` : ""}`;
    return `<i class="${c}">${t.image ? "" : esc(t.name.slice(0, 2).toUpperCase())}</i>`;
  };
  const name = (id: string) => esc(byId.get(id)?.name ?? "?");

  // CRONOLOGIA
  let timeline = "";
  let phasePills = "";
  logs.forEach((l, i) => {
    phasePills += `<a class="pill" href="#p${i}">${phaseIcon(l)} ${esc(phaseLabel(l))}</a>`;
    timeline += `<div class="ph" id="p${i}" data-ph="1">${phaseIcon(l)} ${esc(phaseLabel(l))}<small>${l.events.length} event${l.events.length === 1 ? "o" : "i"}</small></div>`;
    for (const e of l.events) {
      const fatal = e.deaths.length > 0;
      timeline += `<div class="ev${fatal ? " fatal" : ""}" data-p="${e.participants.map((p) => esc(p)).join(" ")}"><div class="avs">${e.participants
        .map((p) => av(p, "av", e.deaths.includes(p)))
        .join("")}</div><p>${esc(e.text)}</p>${fatal ? `<div class="dl">\u{1F480} ${e.deaths.map(name).join(", ")}</div>` : ""}</div>`;
    }
  });

  // CADUTI
  let deaths = "";
  for (const l of logs) {
    let rows = "";
    for (const e of l.events)
      for (const id of e.deaths)
        rows += `<div class="row dead">${av(id, "pic", true)}<div class="info"><div class="n">${name(id)}</div><div class="why">${esc(e.text)}</div></div></div>`;
    if (rows) deaths += `<div class="ph">${phaseIcon(l)} ${esc(phaseLabel(l))}</div>${rows}`;
  }

  // CLASSIFICA
  const ranking = tributes
    .map((t) => ({ t, p: t.isAlive ? 1 : pos.get(t.id) ?? total }))
    .sort((a, b) => a.p - b.p)
    .map(
      ({ t, p }) =>
        `<div class="row${t.isAlive ? "" : " dead"}" data-tid="${esc(t.id)}" data-tname="${esc(t.name)}">${av(t.id, "pic")}<div class="info"><div class="n">${esc(
          t.name
        )}</div><div class="m">${t.isAlive ? "\u{1F451} Vincitore" : "Eliminato: " + esc(where.get(t.id) ?? "")} · ${t.kills} uccision${
          t.kills === 1 ? "e" : "i"
        }</div></div><div class="pos">#${p}</div></div>`
    )
    .join("");

  const days = logs.filter((l) => l.phase === "day").length;
  const dead = tributes.filter((t) => !t.isAlive).length;
  const date = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const desc = winner
    ? `Vincitore: ${winner.name} (${winner.kills} uccision${winner.kills === 1 ? "e" : "i"}) · ${tributes.length} tributi`
    : `${tributes.length} tributi`;

  const hero = winner
    ? `<div class="hero"><div class="crown">\u{1F451}</div>${av(winner.id, "big")}<div class="nm">${esc(winner.name)}</div><div class="kl">Vincitore · ${
        winner.kills
      } uccision${winner.kills === 1 ? "e" : "i"}</div></div>`
    : "";

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0d0814">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<style>${CSS}${imgCss}</style></head>
<body><div class="wrap">
<header><h1>HUNGER GAMES</h1><div class="sub">Replay della partita · ${esc(date)}</div></header>
${hero}
<div class="chips"><div class="chip"><b>${tributes.length}</b><span>Tributi</span></div><div class="chip"><b>${days}</b><span>Giorni</span></div><div class="chip"><b>${dead}</b><span>Caduti</span></div></div>
<input class="rd" type="radio" name="t" id="t1" checked><input class="rd" type="radio" name="t" id="t2"><input class="rd" type="radio" name="t" id="t3">
<nav class="tabs"><div class="tabrow"><label class="tab" for="t1">Cronologia</label><label class="tab" for="t2">Caduti</label><label class="tab" for="t3">Classifica</label></div>
<div class="phases">${phasePills}</div></nav>
<div class="panes">
<section class="pane" id="pane-tl"><div class="tools" id="tools"><select id="flt" aria-label="Filtra per tributo"></select></div>${timeline || '<div class="empty">Nessun evento.</div>'}</section>
<section class="pane" id="pane-dt">${deaths || '<div class="empty">Nessun caduto.</div>'}</section>
<section class="pane" id="pane-tr">${ranking}</section>
</div>
<footer>Generato da Celestial Elysium Hub</footer>
</div>
<script>${JS}</script>
</body></html>`;
}

export function downloadReplayHtml(opts: Parameters<typeof buildReplayHtml>[0]) {
  const html = buildReplayHtml(opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hunger-games-replay-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
