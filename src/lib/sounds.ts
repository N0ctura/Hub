// Effetti sonori sintetizzati con la Web Audio API: nessun file audio da
// caricare, quindi niente problemi di percorsi su GitHub Pages.
// I browser bloccano l'audio finché l'utente non interagisce con la pagina:
// l'AudioContext viene creato (e "svegliato") alla prima chiamata, che avviene
// sempre dentro un click su un pulsante.

type SoundName = "click" | "death" | "day" | "night" | "feast" | "victory";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  out: AudioNode,
  {
    freq,
    start = 0,
    duration = 0.2,
    type = "sine",
    gain = 0.4,
    slideTo,
  }: {
    freq: number;
    start?: number;
    duration?: number;
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  }
) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(c: AudioContext, out: AudioNode, start: number, duration: number, gain: number) {
  const t0 = c.currentTime + start;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const g = c.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.buffer = buffer;
  src.connect(filter).connect(g).connect(out);
  src.start(t0);
}

export function playSound(name: SoundName, enabled = true, volume = 0.5) {
  if (!enabled || volume <= 0) return;
  const c = getCtx();
  if (!c) return;
  const master = c.createGain();
  master.gain.value = Math.min(1, Math.max(0, volume));
  master.connect(c.destination);

  switch (name) {
    case "click":
      tone(c, master, { freq: 520, duration: 0.07, type: "triangle", gain: 0.25 });
      break;
    case "death": // colpo di cannone
      tone(c, master, { freq: 110, slideTo: 38, duration: 0.7, type: "sine", gain: 0.9 });
      noise(c, master, 0, 0.5, 0.6);
      break;
    case "day": // arpeggio luminoso
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(c, master, { freq: f, start: i * 0.11, duration: 0.35, type: "triangle", gain: 0.3 })
      );
      break;
    case "night": // due note basse e inquiete
      tone(c, master, { freq: 196, duration: 1.1, type: "sine", gain: 0.35 });
      tone(c, master, { freq: 185, start: 0.35, duration: 1.1, type: "sine", gain: 0.3 });
      tone(c, master, { freq: 98, start: 0.1, duration: 1.4, type: "triangle", gain: 0.25 });
      break;
    case "feast": // gong
      tone(c, master, { freq: 140, duration: 1.8, type: "sine", gain: 0.6 });
      tone(c, master, { freq: 283, duration: 1.4, type: "sine", gain: 0.3 });
      tone(c, master, { freq: 421, duration: 1.0, type: "triangle", gain: 0.15 });
      break;
    case "victory": // fanfara
      [392, 392, 392, 523, 659, 784].forEach((f, i) =>
        tone(c, master, {
          freq: f,
          start: i * 0.16,
          duration: i === 5 ? 0.9 : 0.22,
          type: "square",
          gain: 0.18,
        })
      );
      break;
  }
}
