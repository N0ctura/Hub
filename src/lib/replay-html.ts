import type { Tribute, SimulationLog } from "@/lib/game-types";

// Genera un file HTML autonomo (nessuna richiesta esterna) con il replay completo
// della partita, pensato per essere aperto da smartphone.

const CSS = `
:root{--bg:#0d0814;--card:#1a1226;--card2:#221833;--gold:#f2b632;--gold2:#c98d12;--text:#f3eefa;--mut:#a79bbd;--red:#ef4a5a;--line:#2f2344}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth;scroll-padding-top:112px}
body{margin:0;background:radial-gradient(1200px 600px at 50% -200px,#2a1745 0,var(--bg) 60%) fixed;color:var(--text);font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding-bottom:env(safe-area-inset-bottom)}
.wrap{max-width:640px;margin:0 auto;padding:0 14px 40px}
header{padding:28px 0 10px;text-align:center}
h1{margin:0;font:700 22px Georgia,serif;letter-spacing:.04em;color:var(--gold)}
.sub{color:var(--mut);font-size:13px;margin-top:4px}
.hero{margin:16px 0;padding:22px 16px;text-align:center;border:1px solid #4b3512;border-radius:16px;background:linear-gradient(160deg,rgba(242,182,50,.18),rgba(242,182,50,.04))}
.hero .crown{font-size:30px;line-height:1}
.hero .big{width:104px;height:104px;margin:10px auto 8px;display:block;border-radius:50%;border:3px solid var(--gold);object-fit:cover;box-shadow:0 0 28px rgba(242,182,50,.35)}
.hero .nm{font:700 24px Georgia,serif}
.hero .kl{color:var(--mut);font-size:14px;margin-top:2px}
.chips{display:flex;gap:8px;justify-content:center;margin-top:12px}
.chip{flex:1;max-width:120px;padding:8px 6px;border-radius:12px;background:var(--card);border:1px solid var(--line);text-align:center}
.chip b{display:block;font-size:20px;color:var(--gold)}
.chip span{font-size:11px;color:var(--mut)}
nav.tabs{position:sticky;top:0;z-index:5;background:rgba(13,8,20,.92);backdrop-filter:blur(8px);margin:0 -14px;padding:10px 14px 0;border-bottom:1px solid var(--line)}
.tabrow{display:flex;gap:6px}
.tab{flex:1;padding:10px 4px;border:0;border-radius:10px 10px 0 0;background:transparent;color:var(--mut);font:600 14px inherit;cursor:pointer}
.tab.on{color:var(--gold);background:var(--card);box-shadow:inset 0 -2px 0 var(--gold)}
.phases{display:flex;gap:6px;overflow-x:auto;padding:8px 0;scrollbar-width:none}
.phases::-webkit-scrollbar{display:none}
.pill{flex:0 0 auto;padding:6px 11px;border-radius:999px;background:var(--card);border:1px solid var(--line);color:var(--text);text-decoration:none;font-size:13px;white-space:nowrap}
.tools{padding:10px 0 0}
select{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:15px}
section.pane{display:none;padding-top:8px}
section.pane.on{display:block}
.ph{margin:18px 0 8px;display:flex;align-items:center;gap:8px;font:700 17px Georgia,serif;color:var(--gold)}
.ph small{margin-left:auto;font:12px system-ui;color:var(--mut)}
.ev{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0}
.ev.fatal{border-left-color:var(--red);background:linear-gradient(90deg,rgba(239,74,90,.12),var(--card) 60%)}
.avs{display:flex;margin-bottom:7px}
.av{width:34px;height:34px;border-radius:50%;border:2px solid var(--card);object-fit:cover;margin-right:-8px;background:var(--card2);flex:none}
.av.dead{filter:grayscale(1);opacity:.7}
.av.ph0,.ph0{display:inline-flex;align-items:center;justify-content:center;font:700 12px system-ui;color:var(--mut)}
.ev p{margin:0;font-size:15px}
.dl{margin-top:6px;font-size:12.5px;font-weight:700;color:var(--red);letter-spacing:.02em}
.row{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0}
.row .pic{width:46px;height:46px;border-radius:50%;border:2px solid var(--gold);object-fit:cover;flex:none;background:var(--card2)}
.row.dead .pic{border-color:#555;filter:grayscale(1)}
.row .info{min-width:0;flex:1}
.row .n{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .m{font-size:12.5px;color:var(--mut)}
.row .pos{font:700 15px Georgia,serif;color:var(--gold);min-width:30px;text-align:right}
.row .why{font-size:13px;color:var(--mut);margin-top:3px}
.empty{color:var(--mut);text-align:center;padding:30px 0}
footer{margin-top:24px;text-align:center;color:var(--mut);font-size:12px}
`;

const JS = `
var D=JSON.parse(document.getElementById('data').textContent);
var T={};D.tributes.forEach(function(t){T[t.id]=t});
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function av(t,c){return t.image?'<img class="'+c+'" src="'+t.image+'" alt="">':'<span class="'+c+' ph0">'+esc(t.name.slice(0,2).toUpperCase())+'</span>'}
function label(l){return l.phase==='day'?'Giorno '+l.n:l.phase==='night'?'Notte '+l.n:'Banchetto'}
function icon(l){return l.phase==='day'?'\\u2600\\uFE0F':l.phase==='night'?'\\uD83C\\uDF19':'\\uD83C\\uDF7D\\uFE0F'}
var flt='';
function renderTimeline(){
  var h='',nav='',any=false;
  D.logs.forEach(function(l,i){
    var evs=l.events.filter(function(e){return !flt||e.p.indexOf(flt)>-1});
    if(!evs.length)return;
    any=true;
    nav+='<a class="pill" href="#p'+i+'">'+icon(l)+' '+esc(label(l))+'</a>';
    h+='<div class="ph" id="p'+i+'">'+icon(l)+' '+esc(label(l))+'<small>'+evs.length+' event'+(evs.length===1?'o':'i')+'</small></div>';
    evs.forEach(function(e){
      var fatal=e.d.length>0;
      h+='<div class="ev'+(fatal?' fatal':'')+'"><div class="avs">'+e.p.map(function(id){var t=T[id];if(!t)return'';return av(t,'av'+(e.d.indexOf(id)>-1?' dead':''))}).join('')+'</div><p>'+esc(e.t)+'</p>';
      if(fatal)h+='<div class="dl">\\uD83D\\uDC80 '+e.d.map(function(id){return esc(T[id]?T[id].name:'?')}).join(', ')+'</div>';
      h+='</div>';
    });
  });
  document.getElementById('tl').innerHTML=any?h:'<div class="empty">Nessun evento per questo tributo.</div>';
  document.getElementById('phases').innerHTML=nav;
}
function renderDeaths(){
  var h='';
  D.logs.forEach(function(l){
    var rows='';
    l.events.forEach(function(e){e.d.forEach(function(id){var t=T[id];if(!t)return;
      var k=e.k&&T[e.k]&&e.k!==id?' <span class="m">\\u2014 ucciso da '+esc(T[e.k].name)+'</span>':'';
      rows+='<div class="row dead">'+av(t,'pic')+'<div class="info"><div class="n">'+esc(t.name)+'</div><div class="why">'+esc(e.t)+'</div></div></div>'});});
    if(rows)h+='<div class="ph">'+icon(l)+' '+esc(label(l))+'</div>'+rows;
  });
  document.getElementById('dt').innerHTML=h||'<div class="empty">Nessun caduto.</div>';
}
function renderTributes(){
  var list=D.tributes.slice().sort(function(a,b){return a.pos-b.pos});
  document.getElementById('tr').innerHTML=list.map(function(t){
    return '<div class="row'+(t.alive?'':' dead')+'">'+av(t,'pic')+'<div class="info"><div class="n">'+esc(t.name)+'</div><div class="m">'+(t.alive?'\\uD83D\\uDC51 Vincitore':'Eliminato: '+esc(t.out))+' \\u00B7 '+t.kills+' uccision'+(t.kills===1?'e':'i')+'</div></div><div class="pos">#'+t.pos+'</div></div>'}).join('');
}
function show(id){
  ['tl','dt','tr'].forEach(function(x){document.getElementById('pane-'+x).classList.toggle('on',x===id)});
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b.dataset.t===id)});
  document.getElementById('tools').style.display=id==='tl'?'block':'none';
  document.getElementById('phases').style.display=id==='tl'?'flex':'none';
  window.scrollTo({top:Math.min(window.scrollY,document.getElementById('tabs').offsetTop)});
}
var sel=document.getElementById('flt');
sel.innerHTML='<option value="">Tutti i tributi</option>'+D.tributes.slice().sort(function(a,b){return a.name.localeCompare(b.name)}).map(function(t){return'<option value="'+t.id+'">'+esc(t.name)+'</option>'}).join('');
sel.onchange=function(){flt=sel.value;renderTimeline()};
document.querySelectorAll('.tab').forEach(function(b){b.onclick=function(){show(b.dataset.t)}});
renderTimeline();renderDeaths();renderTributes();show('tl');
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
  const label = (l: SimulationLog) =>
    l.phase === "day" ? `Giorno ${l.phaseNumber}` : l.phase === "night" ? `Notte ${l.phaseNumber}` : "Banchetto";

  // Ordine di eliminazione -> posizione finale (1 = vincitore)
  const outOrder: { id: string; where: string }[] = [];
  for (const l of logs) for (const e of l.events) for (const id of e.deaths) outOrder.push({ id, where: label(l) });
  const total = tributes.length;
  const pos = new Map<string, number>();
  const where = new Map<string, string>();
  outOrder.forEach((o, i) => {
    pos.set(o.id, total - i);
    where.set(o.id, o.where);
  });

  const data = {
    tributes: tributes.map((t) => ({
      id: t.id,
      name: t.name,
      image: t.image,
      kills: t.kills,
      alive: t.isAlive,
      pos: t.isAlive ? 1 : pos.get(t.id) ?? total,
      out: where.get(t.id) ?? "",
    })),
    logs: logs.map((l) => ({
      phase: l.phase,
      n: l.phaseNumber,
      events: l.events.map((e) => ({ t: e.text, p: e.participants, d: e.deaths, k: e.killerId || null })),
    })),
  };
  // JSON sicuro dentro <script type="application/json">
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");

  const days = logs.filter((l) => l.phase === "day").length;
  const dead = tributes.filter((t) => !t.isAlive).length;
  const date = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const desc = winner
    ? `Vincitore: ${winner.name} (${winner.kills} uccision${winner.kills === 1 ? "e" : "i"}) · ${tributes.length} tributi`
    : `${tributes.length} tributi`;

  const hero = winner
    ? `<div class="hero"><div class="crown">\u{1F451}</div>${
        winner.image
          ? `<img class="big" src="${winner.image.replace(/"/g, "&quot;")}" alt="">`
          : `<span class="big ph0" style="background:#221833">${esc(winner.name.slice(0, 2).toUpperCase())}</span>`
      }<div class="nm">${esc(winner.name)}</div><div class="kl">Vincitore · ${winner.kills} uccision${winner.kills === 1 ? "e" : "i"}</div></div>`
    : "";

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0d0814">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<style>${CSS}</style></head>
<body><div class="wrap">
<header><h1>HUNGER GAMES</h1><div class="sub">Replay della partita · ${esc(date)}</div></header>
${hero}
<div class="chips"><div class="chip"><b>${tributes.length}</b><span>Tributi</span></div><div class="chip"><b>${days}</b><span>Giorni</span></div><div class="chip"><b>${dead}</b><span>Caduti</span></div></div>
<nav class="tabs" id="tabs"><div class="tabrow"><button class="tab on" data-t="tl">Cronologia</button><button class="tab" data-t="dt">Caduti</button><button class="tab" data-t="tr">Classifica</button></div>
<div class="phases" id="phases"></div></nav>
<div class="tools" id="tools"><select id="flt" aria-label="Filtra per tributo"></select></div>
<section class="pane on" id="pane-tl"><div id="tl"></div></section>
<section class="pane" id="pane-dt"><div id="dt"></div></section>
<section class="pane" id="pane-tr"><div id="tr"></div></section>
<footer>Generato da Celestial Elysium Hub</footer>
</div>
<script id="data" type="application/json">${json}</script>
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
