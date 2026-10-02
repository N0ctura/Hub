export interface Tribute {
  id: string;
  name: string;
  image: string | null;
  isAlive: boolean;
  kills: number;
  district?: number;
  clan?: string;
  usedEvents?: string[];
}

export interface GameEvent {
  id: string;
  text: string;
  type: "day" | "night" | "feast" | "arena";
  isFatal: boolean;
  killCount: number;
  killer?: number | null;
  victims?: number[];
  weight?: number;
}

export interface GameConfig {
  dayDuration: number;
  nightDuration: number;
  feastFrequency: number;
  autoPlay: boolean;
  autoPlaySpeed: number;
  deathRate?: number;
  overlayOpacity?: number;
  phaseImages?: {
    day: string;
    night: string;
    feast: string;
  };
}

export interface SimulationLog {
  id: string;
  phase: "day" | "night" | "feast";
  phaseNumber: number;
  events: SimulatedEvent[];
  deaths: string[];
}

export interface SimulatedEvent {
  id: string;
  text: string;
  participants: string[];
  deaths: string[];
  killerId?: string;
  originalEventId?: string;
}

export interface GameState {
  tributes: Tribute[];
  events: GameEvent[];
  objects: string[];
  isRunning: boolean;
  currentPhase: "setup" | "day" | "night" | "feast" | "summary" | "finished";
  currentPhaseNumber: number;
  logs: SimulationLog[];
  winner: Tribute | null;
  pendingEvents: SimulatedEvent[];
  currentStep: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  dayDuration: 3,
  nightDuration: 2,
  feastFrequency: 3,
  autoPlay: false,
  autoPlaySpeed: 2000,
  phaseImages: {
    day: "/images/giorno.webp",
    night: "/images/notte.webp",
    feast: "/images/banchetto.webp"
  }
};

export const DEFAULT_OBJECTS = [
  "spada",
  "arco",
  "lancia",
  "pugnale",
  "ascia",
  "trappola",
  "veleno",
  "rete",
  "freccia",
  "pietra",
  "fionda",
  "corda",
  "torcia",
  "scudo",
  "mazza",
  "tridente",
  "accetta",
  "bastone",
  "coltello da lancio",
  "machete",
];

export const generateDefaultTributes = (): Tribute[] => {
  // Lista opzionale di nomi personalizzati (D1 M, D1 F, D2 M, D2 F, ecc...)
  const customNames = [
    "R0ck", "Glimmer",    // Distretto 1
    "Cato", "Clove",        // Distretto 2
    "Beetee", "Wiress",     // Distretto 3
    "Finnick", "Mags",      // Distretto 4
    "Lil Bro", "Foxface", // Distretto 5
    "Saetta", "Storto",
    "Nabbo", "Johanna", // Distretto 7
    "Il 3", "Checco",
    "S3bo", "Brock",
    "Noctura", "Ginettone",
    "ambrogio", "Rue",        // Distretto 11
    "Peeta", "La Foca"      // Distretto 12
  ];

  // Immagini predefinite DiceBear per i 24 tributi
  const defaultImages = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=T1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=T2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=T3",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=T4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=T5",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=T6",
    "https://api.dicebear.com/7.x/bottts/svg?seed=B1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=B2",
    "https://api.dicebear.com/7.x/bottts/svg?seed=B3",
    "https://api.dicebear.com/7.x/bottts/svg?seed=B4",
    "https://api.dicebear.com/7.x/bottts/svg?seed=B5",
    "https://api.dicebear.com/7.x/bottts/svg?seed=B6",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=L1",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=L2",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=L3",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=L4",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=L5",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=L6",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=P1",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=P2",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=P3",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=P4",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=P5",
    "/images/La Foca.png"
  ];

  return Array.from({ length: 24 }, (_, i) => {
    const district = Math.floor(i / 2) + 1;
    const gender = i % 2 === 0 ? "M" : "F";
    
    // Usa il nome personalizzato se esiste, altrimenti quello standard
    const name = customNames[i] || `Tributo D${district}${gender}`;

    return {
      id: `tribute-${i + 1}`,
      name: name,
      district,
      image: defaultImages[i] || null,
      isAlive: true,
      kills: 0,
      usedEvents: []
    };
  });
};

export const DEFAULT_DAY_EVENTS: GameEvent[] = [
  // EVENTI NON LETALI (120)
  { id: "d1", text: "{P1} raccoglie bacche commestibili.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d2", text: "{P1} trova una sorgente d'acqua.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d3", text: "{P1} costruisce un riparo improvvisato.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d4", text: "{P1} osserva {P2} da lontano.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d5", text: "{P1} e {P2} decidono di collaborare temporaneamente.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d6", text: "{P1} ruba provviste a {P2} mentre dorme.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d7", text: "{P1} cammina per ore senza trovare acqua.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d8", text: "{P1} si nasconde tra i cespugli.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d9", text: "{P1} riceve un paracadute con zuppa calda dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d10", text: "{P1} riceve medicine dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d11", text: "{P1} si arrampica su un albero per avere una visuale migliore.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d12", text: "{P1} pesca con le mani nude.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d13", text: "{P1} e {P2} si alleano.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d14", text: "{P1}, {P2} e {P3} formano un'alleanza.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d15", text: "{P1} caccia un coniglio.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d16", text: "{P1} trova un rifugio abbandonato.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d17", text: "{P1} ripara le sue ferite con foglie medicinali.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d18", text: "{P1} scopre una grotta nascosta.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d19", text: "{P1} si camuffa con fango e foglie.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d20", text: "{P1} evita {P2} per un soffio.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d21", text: "{P1} costruisce una trappola per piccoli animali.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d22", text: "{P1} segue le tracce di {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d23", text: "{P1} affila il suo coltello su una pietra.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d24", text: "{P1} raccoglie legna per il fuoco.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d25", text: "{P1} sente il cannone in lontananza e sorride.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d26", text: "{P1} trova un arco abbandonato.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d27", text: "{P1} riceve una benda dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d28", text: "{P1} medita sulla strategia da adottare.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d29", text: "{P1} si riposa all'ombra di un albero.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d30", text: "{P1} controlla il territorio circostante.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d31", text: "{P1} esplora la foresta.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d32", text: "{P1} cucina un piccolo animale.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d33", text: "{P1} pratica con l'arco.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d34", text: "{P1} pratica con la lancia.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d35", text: "{P1} e {P2} condividono le provviste.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d36", text: "{P1} cerca di decifrare i suoni della foresta.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d37", text: "{P1} trova uno zaino abbandonato.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d38", text: "{P1} riceve acqua purificata dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d39", text: "{P1} crea una mappa mentale dell'arena.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d40", text: "{P1} attraversa un fiume poco profondo.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d41", text: "{P1} si arrampica su una roccia per osservare l'orizzonte.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d42", text: "{P1} incontra {P2} ma decidono di non combattere.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d43", text: "{P1} si lava in un ruscello.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d44", text: "{P1} cerca erbe curative.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d45", text: "{P1} disarma una trappola lasciata da {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d46", text: "{P1} scava una buca per nascondere le provviste.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d47", text: "{P1} sente dei passi e si nasconde velocemente.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d48", text: "{P1} riceve un messaggio di speranza dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d49", text: "{P1} raccoglie funghi commestibili.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d50", text: "{P1} distrae {P2} con un rumore.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d51", text: "{P1} sale su un albero per sfuggire a {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d52", text: "{P1} trova delle frecce sparse.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d53", text: "{P1} pianifica un attacco contro {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d54", text: "{P1} sabota la trappola di {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d55", text: "{P1} corre attraverso i campi aperti.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d56", text: "{P1} spia {P2} e {P3} da dietro un cespuglio.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d57", text: "{P1} si ferisce leggermente ma continua.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d58", text: "{P1} avvista {P2} in lontananza e cambia direzione.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d59", text: "{P1} prepara una fionda artigianale.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d60", text: "{P1} raccoglie radici commestibili.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d61", text: "{P1} si addormenta brevemente all'ombra.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d62", text: "{P1} costruisce una lancia con un ramo.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d63", text: "{P1} sente voci in lontananza e si nasconde.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d64", text: "{P1} guarda il cielo pensando ai propri cari.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d65", text: "{P1} attraversa un campo di fiori velenosi con cautela.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d66", text: "{P1} scopre una cascata nascosta.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d67", text: "{P1} riceve un coltello dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d68", text: "{P1} e {P2} si scambiano informazioni.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d69", text: "{P1} medita vendetta contro {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d70", text: "{P1} decide di spostarsi verso nord.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d71", text: "{P1} trova impronte fresche e le segue.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d72", text: "{P1} ripara il proprio rifugio.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d73", text: "{P1} si esercita nel lancio dei coltelli.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d74", text: "{P1} raccoglie pietre affilate.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d75", text: "{P1} sente un rumore sospetto ma è solo il vento.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d76", text: "{P1} cammina lungo il fiume.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d77", text: "{P1} nasconde le proprie tracce.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d78", text: "{P1} e {P2} si fronteggiano ma nessuno attacca.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d79", text: "{P1} trova un nido di uova e le mangia crude.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d80", text: "{P1} vede fumo in lontananza.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d81", text: "{P1} si allontana dalla Cornucopia.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d82", text: "{P1} trova una borraccia vuota.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d83", text: "{P1} si rifugia in una cavità dell'albero.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d84", text: "{P1} raccoglie corteccia per accendere il fuoco.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d85", text: "{P1} marca il territorio con segni sugli alberi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d86", text: "{P1} vede una colonna di fumo e la evita.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d87", text: "{P1} attraversa un campo di spine con difficoltà.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d88", text: "{P1} e {P2} si inseguono ma si perdono nella foresta.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d89", text: "{P1} trova uno scudo arrugginito.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d90", text: "{P1} fa una pausa per riposare le gambe.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d91", text: "{P1} riceve un accendino dagli sponsor.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d92", text: "{P1} scopre una pozza d'acqua torbida e la purifica.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d93", text: "{P1} canta sottovoce per farsi coraggio.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d94", text: "{P1} scambia sguardi tesi con {P2} da lontano.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d95", text: "{P1} organizza le proprie provviste.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d96", text: "{P1} studia il movimento delle nuvole.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d97", text: "{P1} setaccia un'area alla ricerca di utensili.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d98", text: "{P1} crea un segnale di fumo per confondere i nemici.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d99", text: "{P1} prepara un agguato che non viene mai usato.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d100", text: "{P1} trova un vecchio zaino con cibo avariato.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d101", text: "{P1} si arrampica su una collina per vedere meglio.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d102", text: "{P1} scava una trincea per proteggersi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d103", text: "{P1} cerca di imitare il verso degli uccelli.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d104", text: "{P1} costruisce una zattera improvvisata.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d105", text: "{P1} scopre le rovine di un vecchio accampamento.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d106", text: "{P1} e {P2} si promettono di non tradirsi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d107", text: "{P1} raccoglie fango per mimetizzarsi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d108", text: "{P1} avvista un paracadute ma era per {P2}.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d109", text: "{P1} cammina in cerchio senza accorgersene.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d110", text: "{P1} trova un pugnale incastrato in un albero.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d111", text: "{P1} raccoglie muschio per le ferite.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d112", text: "{P1} si copre con foglie per mimetizzarsi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d113", text: "{P1} sente l'inno di Panem e si emoziona.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d114", text: "{P1} insegue una farfalla colorata per distrarsi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d115", text: "{P1} urla contro il cielo per liberare la tensione.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d116", text: "{P1} contempla la possibilità di arrendersi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d117", text: "{P1} cerca di contare quanti tributi sono ancora vivi.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d118", text: "{P1} promette a se stesso di tornare a casa.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d119", text: "{P1} nasconde del cibo in un punto strategico.", type: "day", isFatal: false, killCount: 0, weight: 5 },
  { id: "d120", text: "{P1} si allena mentalmente per il prossimo scontro.", type: "day", isFatal: false, killCount: 0, weight: 5 },

  // EVENTI LETALI (10)
  { id: "d121", text: "{P1} tende un'imboscata a {P2} e lo uccide.", type: "day", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "d122", text: "{P1} scaglia una lancia contro {P2}.", type: "day", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "d123", text: "{P1} cade in una trappola mortale.", type: "day", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "d124", text: "{P1} mangia bacche velenose.", type: "day", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "d125", text: "{P1} viene colpito dalla pioggia acida e muore tra le fiamme.", type: "day", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "d126", text: "{P1} tradisce {P2} e lo pugnala a morte.", type: "day", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "d127", text: "{P1} cade da un albero e muore sul colpo.", type: "day", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "d128", text: "{P1} viene attaccato dalle vespe aghi-mortali e muore dissanguato.", type: "day", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "d129", text: "{P1} strangola {P2} con una corda.", type: "day", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "d130", text: "{P1} viene morso da un serpente velenoso e muore in pochi minuti.", type: "day", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
];

export const DEFAULT_NIGHT_EVENTS: GameEvent[] = [
  // EVENTI NON LETALI (120)
  { id: "n1", text: "{P1} dorme a turni.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n2", text: "{P1} piange pensando a casa.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n3", text: "{P1} cerca di accendere un fuoco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n7", text: "{P1} guarda le stelle cercando conforto.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n8", text: "{P1} sente rumori inquietanti nel bosco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n9", text: "{P1} fa la guardia mentre {P2} dorme.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n10", text: "{P1} si sveglia di soprassalto da un incubo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n11", text: "{P1} racconta storie a {P2} davanti al fuoco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n12", text: "{P1} trema dal freddo tutta la notte.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n13", text: "{P1} sente ululati in lontananza.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n14", text: "{P1} cura le proprie ferite al buio.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n15", text: "{P1} si rannicchia per conservare il calore.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n16", text: "{P1} e {P2} si stringono per riscaldarsi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n17", text: "{P1} vede i volti dei caduti proiettati nel cielo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n18", text: "{P1} pensa a una strategia per l'indomani.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n19", text: "{P1} ascolta il silenzio della notte.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n20", text: "{P1} si addormenta per sfinimento.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n21", text: "{P1} ha allucinazioni a causa della fame.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n22", text: "{P1} controlla il perimetro del campo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n23", text: "{P1} sente passi ma non vede nessuno.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n24", text: "{P1} medita in silenzio.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n25", text: "{P1} affila la lama alla luce della luna.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n26", text: "{P1} si copre con foglie per proteggersi dal freddo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n27", text: "{P1} prega per la propria salvezza.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n28", text: "{P1} sogna la propria famiglia.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n29", text: "{P1} ripensa agli eventi del giorno.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n30", text: "{P1} fischia una melodia per calmarsi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n31", text: "{P1} si domanda chi rimarrà vivo all'alba.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n32", text: "{P1} nasconde le armi sotto il rifugio.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n33", text: "{P1} osserva la luna piena.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n34", text: "{P1} sente il cannone e conta i colpi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n35", text: "{P1} si sveglia ogni ora per paura.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n36", text: "{P1} stringe il coltello mentre cerca di dormire.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n37", text: "{P1} sente un fruscio tra gli alberi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n38", text: "{P1} si chiede se gli sponsor lo stanno guardando.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n39", text: "{P1} ricorda il giorno della Mietitura.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n40", text: "{P1} si addormenta tenendo stretta l'arma.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n41", text: "{P1} ascolta il canto degli insetti notturni.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n42", text: "{P1} si avvolge nella coperta termica degli sponsor.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n43", text: "{P1} spera che domani sarà un giorno migliore.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n44", text: "{P1} riflette su chi fidarsi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n45", text: "{P1} vede delle ombre muoversi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n46", text: "{P1} rimane sveglio tutta la notte.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n47", text: "{P1} cerca di decifrare i suoni della notte.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n48", text: "{P1} pensa a come vincere i Giochi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n49", text: "{P1} si riscalda vicino al fuoco morente.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n50", text: "{P1} sussurra parole di incoraggiamento a se stesso.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n51", text: "{P1} vede gli occhi di un animale nel buio.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n52", text: "{P1} ripara il rifugio danneggiato.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n53", text: "{P1} lotta contro il sonno per rimanere vigile.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n54", text: "{P1} nasconde il fuoco per non farsi vedere.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n55", text: "{P1} e {P2} condividono ricordi felici.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n56", text: "{P1} ha la febbre ma resiste.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n57", text: "{P1} beve acqua alla luce della luna.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n58", text: "{P1} sente delle grida lontane.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n59", text: "{P1} si interroga sulla propria umanità.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n60", text: "{P1} conta le stelle per passare il tempo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n61", text: "{P1} si chiede chi morirà per primo domani.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n62", text: "{P1} dorme abbracciato alle proprie provviste.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n63", text: "{P1} osserva il chiarore dell'alba avvicinarsi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n64", text: "{P1} tossisce per il fumo del fuoco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n65", text: "{P1} ripensa al discorso del mentore.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n66", text: "{P1} sente freddo alle ossa.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n67", text: "{P1} scrive mentalmente una lettera a casa.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n68", text: "{P1} si prepara psicologicamente per il giorno successivo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n69", text: "{P1} cerca di ricordare le regole dell'arena.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n70", text: "{P1} si domanda se la famiglia lo sta guardando.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n71", text: "{P1} vede bagliori in lontananza.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n72", text: "{P1} si lamenta sottovoce del dolore.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n73", text: "{P1} stringe i denti per il freddo pungente.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n74", text: "{P1} canta una ninna nanna del distretto.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n75", text: "{P1} pianifica una fuga verso le montagne.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n76", text: "{P1} sente battere forte il proprio cuore.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n77", text: "{P1} si chiede cosa stanno tramando gli altri tributi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n78", text: "{P1} rabbrividisce sentendo urla nella foresta.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n79", text: "{P1} si chiede se merita di vincere.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n80", text: "{P1} si addormenta recitando una preghiera.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n81", text: "{P1} controlla più volte che le armi siano al sicuro.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n82", text: "{P1} alimenta il fuoco con rametti secchi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n83", text: "{P1} sente il vento fischiare tra gli alberi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n84", text: "{P1} si copre il volto con le mani e piange in silenzio.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n85", text: "{P1} cerca di restare ottimista.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n86", text: "{P1} ascolta attentamente ogni suono.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n87", text: "{P1} si promette di sopravvivere un altro giorno.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n88", text: "{P1} si chiede se è ancora umano dopo tutto quello che ha fatto.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n89", text: "{P1} ricorda il sapore del pane fresco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n90", text: "{P1} osserva le braci morire lentamente.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n91", text: "{P1} immagina la vittoria e il ritorno a casa.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n92", text: "{P1} cerca di non pensare ai caduti.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n93", text: "{P1} si rannicchia in posizione fetale.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n94", text: "{P1} sente qualcuno camminare nel buio ma rimane immobile.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n95", text: "{P1} guarda il cielo e cerca costellazioni familiari.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n96", text: "{P1} sente il profumo della pioggia in arrivo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n97", text: "{P1} stringe i pugni per non urlare dalla paura.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n98", text: "{P1} si addormenta mormorando il nome di qualcuno.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n99", text: "{P1} rivede mentalmente la mappa dell'arena.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n100", text: "{P1} si sveglia convinto di aver sentito il proprio nome.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n101", text: "{P1} cerca di ricordare un momento felice.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n102", text: "{P1} si domanda se i suoi amici sono ancora vivi.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n103", text: "{P1} sente qualcosa strisciare vicino ma non si muove.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n104", text: "{P1} sussulta a ogni rumore.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n105", text: "{P1} si asciuga le lacrime in silenzio.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n106", text: "{P1} si addormenta fantasticando sulla colazione a casa.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n107", text: "{P1} sente il freddo penetrare nelle ossa.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n108", text: "{P1} ripete un mantra per restare calmo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n109", text: "{P1} si chiede quanto durerà ancora.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n110", text: "{P1} si sveglia tremante da un sogno terribile.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n111", text: "{P1} vede occhi luminosi nel buio e si paralizza.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n112", text: "{P1} dorme con una mano sul coltello.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n113", text: "{P1} sente la propria coscienza pesare.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n114", text: "{P1} cerca di riscaldare le mani sul fuoco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n115", text: "{P1} sente la solitudine divorarlo.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n116", text: "{P1} osserva le ombre danzare alla luce del fuoco.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n117", text: "{P1} pensa a cosa direbbe ai familiari se potesse.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n118", text: "{P1} si chiede se il Capitol sta guardando in questo momento.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n119", text: "{P1} ascolta il suono della propria respirazione.", type: "night", isFatal: false, killCount: 0, weight: 5 },
  { id: "n120", text: "{P1} si addormenta sperando di non svegliarsi mai più.", type: "night", isFatal: false, killCount: 0, weight: 5 },

  // EVENTI LETALI (10)
  { id: "n121", text: "{P1} uccide {P2} nel sonno.", type: "night", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "n122", text: "{P1} muore di ipotermia.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "n123", text: "{P1} viene sbranato dai lupi mutanti.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "n124", text: "{P1} viene aggredito da {P2} e ucciso silenziosamente.", type: "night", isFatal: true, killCount: 1, killer: 2, victims: [1], weight: 5 },
  { id: "n125", text: "{P1} viene avvolto dalla nebbia tossica e muore soffocato.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "n126", text: "{P1} cade in un burrone nel buio.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "n127", text: "{P1} viene attaccato dalle scimmie mutanti e fatto a pezzi.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "n128", text: "{P1} sgozza {P2} mentre dorme.", type: "night", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "n129", text: "{P1} viene morso da un ragno velenoso e muore in agonia.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "n130", text: "{P1} viene trascinato sott'acqua da una creatura mutante.", type: "night", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
];

export const DEFAULT_FEAST_EVENTS: GameEvent[] = [
  // EVENTI NON LETALI (120)
  { id: "f1", text: "{P1} corre alla Cornucopia e prende uno zaino.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f2", text: "{P1} decide di non andare al banchetto.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f3", text: "{P1} e {P2} si scontrano per le provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f6", text: "{P1} afferra medicine e scappa velocemente.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f7", text: "{P1} ruba lo zaino di {P2} e fugge.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f8", text: "{P1} aspetta che gli altri se ne vadano prima di avvicinarsi.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f9", text: "{P1} osserva il caos da lontano.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f10", text: "{P1} prende cibo e acqua senza essere visto.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f11", text: "{P1} e {P2} collaborano per raccogliere provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f12", text: "{P1} viene ferito leggermente ma riesce a fuggire.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f13", text: "{P1} cerca di prendere un'arma ma viene bloccato da {P2}.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f14", text: "{P1} afferra uno zaino e corre verso la foresta.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f15", text: "{P1} inciampa ma si rialza in tempo.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f16", text: "{P1} decide all'ultimo di non rischiare.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f17", text: "{P1} lancia una pietra per distrarre {P2}.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f18", text: "{P1} nasconde provviste per dopo.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f19", text: "{P1} corre alla Cornucopia e prende un arco.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f20", text: "{P1} evita {P2} per un soffio.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f21", text: "{P1} schiva un attacco di {P2} e scappa.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f22", text: "{P1} prende una lancia e si allontana.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f23", text: "{P1} osserva {P2} combattere contro {P3}.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f24", text: "{P1} afferra una borsa di medicinali.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f25", text: "{P1} si scontra con {P2} ma entrambi fuggono.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f26", text: "{P1} prende cibo e si nasconde tra le rocce.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f27", text: "{P1} cerca di prendere uno zaino ma è troppo lento.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f28", text: "{P1} riesce a prendere solo una borraccia.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f29", text: "{P1} aspetta pazientemente il momento giusto.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f30", text: "{P1} afferra uno zaino e cade ma si rialza.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f31", text: "{P1} vede {P2} morire ma continua a raccogliere provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f32", text: "{P1} ruba l'arma di {P2} nel caos.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f33", text: "{P1} lotta con {P2} ma nessuno prevale.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f34", text: "{P1} si ritira dopo aver preso solo cibo.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f35", text: "{P1} corre verso la Cornucopia ma cambia idea.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f36", text: "{P1} prende un pugnale e scappa.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f37", text: "{P1} riceve un taglio superficiale ma sopravvive.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f38", text: "{P1} aiuta {P2} a raccogliere provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f39", text: "{P1} si nasconde dietro la Cornucopia.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f40", text: "{P1} corre più veloce di {P2} e prende lo zaino.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f41", text: "{P1} afferra un'ascia e la porta via.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f42", text: "{P1} trova una borsa nascosta.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f43", text: "{P1} spinge {P2} e scappa con le provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f44", text: "{P1} combatte con {P2} per uno zaino ma lo lascia andare.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f45", text: "{P1} si accorge di essere circondato e fugge.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f46", text: "{P1} prende delle frecce e se ne va.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f47", text: "{P1} osserva il banchetto da una posizione sicura.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f48", text: "{P1} afferra un kit di primo soccorso.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f49", text: "{P1} viene inseguito da {P2} ma riesce a scappare.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f50", text: "{P1} prende una spada e si allontana.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f51", text: "{P1} combatte brevemente con {P2} poi fugge.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f52", text: "{P1} trova un riparo temporaneo vicino alla Cornucopia.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f53", text: "{P1} afferra acqua e cibo velocemente.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f54", text: "{P1} prende solo ciò di cui ha bisogno e scappa.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f55", text: "{P1} vede {P2} e {P3} combattere e ne approfitta.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f56", text: "{P1} afferra una rete e se ne va.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f57", text: "{P1} trova una coperta termica.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f58", text: "{P1} viene bloccato da {P2} ma riesce a divincolarsi.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f59", text: "{P1} prende un tridente dalla Cornucopia.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f60", text: "{P1} corre in cerchio per confondere {P2}.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f61", text: "{P1} afferra una torcia e la usa per scappare.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f62", text: "{P1} lascia cadere lo zaino ma prende cibo.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f63", text: "{P1} si ferisce alla gamba ma continua a correre.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f64", text: "{P1} inganna {P2} con una finta.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f65", text: "{P1} raccoglie ciò che può e se ne va.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f66", text: "{P1} evita un combattimento e prende solo acqua.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f67", text: "{P1} si nasconde finché il caos non si placa.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f68", text: "{P1} afferra una mazza e corre via.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f69", text: "{P1} prende un machete e lo nasconde.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f70", text: "{P1} trova uno scudo abbandonato.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f71", text: "{P1} corre verso la foresta con uno zaino.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f72", text: "{P1} prende corde e frecce.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f73", text: "{P1} viene inseguito ma trova una via di fuga.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f74", text: "{P1} afferra pillole per il dolore.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f75", text: "{P1} si allea temporaneamente con {P2} al banchetto.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f76", text: "{P1} prende un paio di guanti rinforzati.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f77", text: "{P1} raccoglie bende e disinfettante.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f78", text: "{P1} trova uno zaino pieno di cibo in scatola.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f79", text: "{P1} prende una baionetta e se ne va.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f80", text: "{P1} evita di essere visto e prende provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f81", text: "{P1} corre alla Cornucopia e trova un coltello da caccia.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f82", text: "{P1} cerca di aiutare {P2} ma fugge.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f83", text: "{P1} prende solo l'essenziale e corre via.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f84", text: "{P1} trova una fionda e delle pietre.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f85", text: "{P1} schiva {P2} e {P3} durante il caos.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f86", text: "{P1} afferra pillole per purificare l'acqua.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f87", text: "{P1} vede {P2} cadere ma continua a correre.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f88", text: "{P1} raccoglie una sacca di semi commestibili.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f89", text: "{P1} prende del veleno per difendersi.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f90", text: "{P1} trova un kit per accendere il fuoco.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f91", text: "{P1} afferra un giubbotto protettivo.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f92", text: "{P1} nasconde alcune provviste per il futuro.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f93", text: "{P1} prende una sacca di erbe medicinali.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f94", text: "{P1} combatte per uno zaino ma lo perde.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f95", text: "{P1} trova occhiali per la visione notturna.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f96", text: "{P1} raccoglie filo spinato per trappole.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f97", text: "{P1} prende cibo disidratato e acqua.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f98", text: "{P1} afferra un corno per segnali.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f99", text: "{P1} osserva {P2} rubare provviste.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f100", text: "{P1} trova stivali resistenti.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f101", text: "{P1} prende un accendino e cerini.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f102", text: "{P1} raccoglie barattoli di miele.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f103", text: "{P1} afferra una bisaccia piena di barrette energetiche.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f104", text: "{P1} trova un piccone e lo porta via.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f105", text: "{P1} vede {P2} ma decide di non combattere.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f106", text: "{P1} prende fiale di antidoto.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f107", text: "{P1} nasconde uno zaino tra i cespugli.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f108", text: "{P1} afferra una rete da pesca.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f109", text: "{P1} raccoglie cartucce esplosive.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f110", text: "{P1} trova un manuale di sopravvivenza.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f111", text: "{P1} prende una lanterna a olio.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f112", text: "{P1} raccoglie compresse vitaminiche.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f113", text: "{P1} trova un binocolo e lo nasconde.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f114", text: "{P1} afferra un kit di riparazione per armi.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f115", text: "{P1} prende una mappa parziale dell'arena.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f116", text: "{P1} raccoglie una coperta impermeabile.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f117", text: "{P1} trova sali minerali e li porta via.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f118", text: "{P1} afferra una bussola e scappa.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f119", text: "{P1} prende aghi e filo per suturare.", type: "feast", isFatal: false, killCount: 0, weight: 5 },
  { id: "f120", text: "{P1} raccoglie sapone antibatterico e se ne va.", type: "feast", isFatal: false, killCount: 0, weight: 5 },

  // EVENTI LETALI (10)
  { id: "f121", text: "{P1} uccide {P2} con un'ascia alla Cornucopia.", type: "feast", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "f122", text: "{P1} lancia un coltello a {P2}, uccidendolo.", type: "feast", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "f123", text: "{P1} viene trafitto da {P2} con una lancia.", type: "feast", isFatal: true, killCount: 1, killer: 2, victims: [1], weight: 5 },
  { id: "f124", text: "{P1} spezza il collo di {P2} alla Cornucopia.", type: "feast", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "f125", text: "{P1} calpesta una mina esplosiva e muore.", type: "feast", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "f126", text: "{P1} viene abbattuto da {P2} con una freccia.", type: "feast", isFatal: true, killCount: 1, killer: 2, victims: [1], weight: 5 },
  { id: "f127", text: "{P1} decapita {P2} con una spada alla Cornucopia.", type: "feast", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "f128", text: "{P1} viene schiacciato nella ressa alla Cornucopia.", type: "feast", isFatal: true, killCount: 1, killer: null, victims: [1], weight: 5 },
  { id: "f129", text: "{P1} sgozza {P2} con un coltello da caccia.", type: "feast", isFatal: true, killCount: 1, killer: 1, victims: [2], weight: 5 },
  { id: "f130", text: "{P1} viene pugnalato ripetutamente da {P2} alla Cornucopia.", type: "feast", isFatal: true, killCount: 1, killer: 2, victims: [1], weight: 5 },
];
