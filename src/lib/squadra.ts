// Dati dell'easter egg "la squadra si presenta" (src/components/EasterEgg.astro).
//
// I sette soldatini sono pixel art ORIGINALE, disegnata qui in codice: nessuno sprite è copiato da un
// videogioco esistente. Non sono sette disegni scollegati: partono tutti dalla stessa testa, dallo stesso
// busto e dalle stesse gambe (generati da parametri) e si differenziano per sagoma, copricapo e oggetto.
//
// Convenzioni:
//  - ogni sprite è una griglia di LARG x ALT pixel, vista di tre quarti rivolta a destra;
//  - ogni carattere è un colore della tavolozza (".", e " " nelle toppe, sono trasparenti);
//  - il contorno scuro di 1 pixel NON si disegna a mano: lo aggiunge `incolla()` attorno a ogni parte;
//  - i fotogrammi sono "passo" (0 = gambe divaricate, 1 = gambe dritte e busto più alto, 2 = fermo)
//    e "dettaglio" (il pezzo animato: catena, scintilla, scie, schermo…).

export const LARG = 30;
export const ALT = 34;
/** Colonna del corpo, attorno a cui si centra il personaggio. */
export const CENTRO = 11;

/** Tavolozza comune. A e a sono l'accento (chiaro e scuro) di ciascun personaggio. */
export const TAVOLOZZA: Record<string, string> = {
  K: '#12160f', // contorno e neri
  g: '#5d8040', // divisa
  G: '#86ac62', // divisa, luce
  d: '#3a5330', // divisa, ombra
  s: '#ebbd92', // incarnato (uguale per tutti)
  S: '#c68c64', // incarnato, ombra
  h: '#4b3424', // capelli
  w: '#f3eedd', // bianco osso
  b: '#4c3b31', // stivali, cinture
  M: '#bcc5c2', // metallo chiaro
  m: '#6b7572', // metallo scuro
  r: '#dc3b30', // rosso
  e: '#8f1f19', // rosso scuro
  y: '#f6d53c', // giallo
  o: '#f08b25', // arancio
  t: '#8d5b2c', // corteccia
  T: '#dcb27b', // legno chiaro
  c: '#47cbf0', // azzurro
  z: '#30353c', // giacca scura
  Z: '#59616b', // giacca, luce
  n: '#1b2f6e', // cravatta scura
};

type Griglia = string[][];

const vuota = (): Griglia => Array.from({ length: ALT }, () => Array<string>(LARG).fill('.'));
const pieno = (c: string | undefined) => c !== undefined && c !== '.' && c !== ' ';

/** Incolla un pezzo (righe di caratteri) con il suo contorno di 1 pixel: i pezzi vanno dal fondo al davanti. */
function incolla(g: Griglia, righe: string[], x: number, y: number, contorno = true) {
  const largh = Math.max(...righe.map((r) => r.length));
  const at = (i: number, j: number) => righe[j]?.[i];
  for (let j = -1; j <= righe.length; j++) {
    for (let i = -1; i <= largh; i++) {
      const X = x + i;
      const Y = y + j;
      if (X < 0 || X >= LARG || Y < 0 || Y >= ALT) continue;
      if (pieno(at(i, j))) g[Y][X] = at(i, j)!;
      else if (contorno && (pieno(at(i - 1, j)) || pieno(at(i + 1, j)) || pieno(at(i, j - 1)) || pieno(at(i, j + 1)))) g[Y][X] = 'K';
    }
  }
}

/** Come incolla(), ma per un pezzo disegnato punto per punto su una griglia a parte. */
function incollaGriglia(g: Griglia, p: Griglia) {
  incolla(
    g,
    p.map((riga) => riga.join('')),
    0,
    0,
  );
}

/** Sovrappone una toppa a una griglia di righe: " " lascia com'è, "." cancella. */
function toppa(righe: string[], x: number, y: number, t: string[]): string[] {
  const out = righe.map((r) => r.split(''));
  t.forEach((riga, j) => {
    [...riga].forEach((c, i) => {
      if (c === ' ') return;
      while (out[y + j].length <= x + i) out[y + j].push('.');
      out[y + j][x + i] = c;
    });
  });
  return out.map((r) => r.join(''));
}

/** Toglie colonne e righe a una griglia di righe (per le teste più piccole o più strette). */
function riduci(righe: string[], colonne: number[], tolte: number[] = []): string[] {
  return righe.filter((_, j) => !tolte.includes(j)).map((r) => [...r].filter((_, i) => !colonne.includes(i)).join(''));
}

const ricolora = (righe: string[], da: string, a: string) => righe.map((r) => r.replaceAll(da, a));

// ── Parti comuni ────────────────────────────────────────────────────────────────────────────────

/** La testa base: 8 righe, circa 12 colonne, faccia a destra (occhio bianco con pupilla). */
const TESTA = [
  '...hhhhhhh..',
  '..hhhhhhhhh.',
  '.hhhhhhhhhhh',
  '.hhhssssssss',
  '.hhsssswKsss',
  '.hhssssssssss',
  '.hhssssssSSs',
  '..hssssssss.',
];

/** Gambe: due tubi con stivali. Divaricate (passo 0) o dritte (passi 1 e 2). */
interface ParamGambe {
  w: number; // larghezza di una gamba
  n: number; // altezza (a gambe divaricate)
  sp: number; // quanto si allargano nel passo
  col: string;
  ombra: string;
  stivale: string;
}

function gambe(g: Griglia, p: ParamGambe, passo: 0 | 1 | 2) {
  const n = p.n + (passo === 1 ? 1 : 0); // dritte sono più lunghe: il busto si alza di un pixel
  const y0 = ALT - 1 - n;
  const sp = passo === 0 ? p.sp : 0;
  const L = vuota();
  const gamba = (xTop: number, verso: 1 | -1, davanti: boolean) => {
    for (let i = 0; i < n; i++) {
      const x = xTop + verso * Math.round((sp * i) / Math.max(1, n - 1));
      const stiv = i >= n - 2;
      for (let k = 0; k < p.w; k++) L[y0 + i][x + k] = stiv ? p.stivale : k === p.w - 1 && p.w > 2 ? p.ombra : p.col;
      if (stiv && davanti) L[y0 + i][x + p.w] = p.stivale; // punta dello stivale
    }
  };
  gamba(CENTRO - p.w, -1, false);
  gamba(CENTRO + 1, 1, true);
  incollaGriglia(g, L);
  return { y0, n };
}

/** Busto: larghezze (una per riga, dall'alto) e stile della divisa. */
type Stile = 'divisa' | 'giacca';

function colore(stile: Stile, i: number, j: number, w: number, h: number): string {
  if (stile === 'giacca') {
    const m = Math.floor(w / 2);
    if (i === 0) return j === m - 1 || j === m ? 'w' : 'Z'; // colletto e camicia
    if (i === 1 && j === m - 1) return 'w';
    if (j === m) return 'n'; // cravatta
    if (j === 0) return 'Z';
    return 'z';
  }
  if (i === 0) return 'G';
  if (i === h - 2) return 'b';
  if (i === h - 1) return j === w - 1 ? 'd' : 'g';
  if (j === 0 || j === w - 1) return 'g';
  // tasche del giubbotto: due quadratini scuri
  if (i === h - 3 && (j === 2 || j === 3 || j === w - 4 || j === w - 3)) return 'b';
  return 'd';
}

function busto(g: Griglia, larghezze: number[], stile: Stile, y: number, cx: number) {
  const L = vuota();
  const h = larghezze.length;
  larghezze.forEach((w, i) => {
    const x0 = cx - Math.floor(w / 2);
    for (let j = 0; j < w; j++) L[y + i][x0 + j] = colore(stile, i, j, w, h);
  });
  incollaGriglia(g, L);
  const w1 = larghezze[Math.min(1, h - 1)];
  return { x0: cx - Math.floor(larghezze[0] / 2), bordoDestro: cx - Math.floor(w1 / 2) + w1 - 1 };
}

/** Braccio vicino, piegato in avanti: spalla 3x3 e avambraccio con la mano (2x2) a destra. */
const BRACCIO = ['ggg...', 'gGg...', 'ggggss', '..ggss'];

// ── Descrizione dei personaggi ──────────────────────────────────────────────────────────────────

/** Tutto ciò che serve a disegnare gli oggetti: dove sono busto, testa e mano in questo fotogramma. */
interface Punti {
  passo: 0 | 1 | 2;
  det: number;
  /** Colonna del bordo destro del busto e riga del suo bordo superiore. */
  rx: number;
  by: number;
  /** Colonna e riga della testa, larghezza della testa. */
  tx: number;
  ty: number;
  /** Mano del braccio base: angolo in alto a sinistra del 2x2. */
  hx: number;
  hy: number;
  x0: number;
}

interface Spec {
  id: string;
  nome: string;
  battuta: string;
  accento: [string, string];
  /** Quanti fotogrammi ha il dettaglio animato. */
  dettagli: number;
  testa: string[];
  busto: { larghezze: number[]; stile: Stile };
  gambe: ParamGambe;
  /** Spostamento in avanti di testa e busto (chi corre è piegato in avanti). */
  inclina?: number;
  /** Disegna dietro al corpo (scie, code della bandana). */
  dietro?: (g: Griglia, p: Punti) => void;
  /** Disegna sopra al corpo: braccio e oggetto. */
  davanti: (g: Griglia, p: Punti) => void;
}

const VERDE: ParamGambe = { w: 3, n: 6, sp: 3, col: 'g', ombra: 'd', stivale: 'b' };
const BUSTO_BASE = { larghezze: [10, 10, 10, 10, 10, 10], stile: 'divisa' as Stile };

/** Il braccio base e, dietro, ciò che regge. */
function braccio(g: Griglia, p: Punti, righe = BRACCIO, dx = -2, dy = 1) {
  incolla(g, righe, p.rx + dx, p.by + dy);
}

// Testa dei personaggi: la base con copricapo ed espressione.
// Jason: testa scoperta con capelli scuri e una maschera bianca da portiere di hockey (disegno generico):
// ovale bianco osso (w, con l'ombra M a destra) che copre tutta la faccia, due fori per gli occhi (K) e una
// fila di forellini sulle guance e sul mento.
const TESTA_JASON = [
  '..hhhhhhh.',
  '.hhhwwwwM.',
  '.hhwwwwwwM',
  '.hhwKKwKKM',
  '.hhwKKwKKM',
  '.hhwwwwwwM',
  '.hhwKwKwKM',
  '..hhwwwwM.',
  '...hhwwM..',
];

// Limone: la testa è letteralmente un limone (ovale con le due punte, luce y, tono medio A, ombra a, foglia
// verde in cima), con gli occhi (bianco e pupilla) e un sorriso disegnati sopra. Niente incarnato.
const TESTA_LIMONE = [
  '........GG...',
  '.......GGGg..',
  '......dGg....',
  '....yyyAA....',
  '..yyyyAAAAa..',
  '..yyAwKAwKa..',
  '.yyAAwKAwKAa.',
  'yAAAAAAAAAAAa',
  '.AAAAAAKAKaa.',
  '..AAAAAAKaa..',
  '..AAAaaaaaa..',
  '....aaaaa....',
];

const TESTA_REAPER = toppa(TESTA, 0, 0, [
  '  AAAAAAAAA ',
  ' AAAAAAAAAAA',
  'AAAAAAAAAAAA',
  'AAAAaaaaaaa ',
  'AAAaa       ',
  'AAAaa       ',
  'AAAaa       ',
  'AAAAA       ',
]);

// Faceman è a testa scoperta: capelli corti scuri, con ciuffo, attaccatura sulla fronte e nuca coperta.
const TESTA_FACEMAN = toppa(TESTA, 0, 0, [
  '   hh       ',
  '            ',
  '            ',
  ' hhhhhhhsss ',
  '            ',
  '            ',
  ' hh         ',
  ' hhhhs      ',
]);

const TESTA_KYNNYX = riduci(
  toppa(TESTA, 0, 0, [
    '   AAAAAAA  ',
    '  AAyAAAAAA ',
    ' AAAAAAAAAAA',
    'aaaaa       ',
  ]),
  [5, 6],
  [1],
);

const TESTA_RICO = toppa(TESTA, 0, 0, [
  '            ',
  '            ',
  ' AAAAAAAAAAA',
  ' aaaaaaaaaa ',
  '            ',
  '            ',
  '       KwwK ',
]);

const TESTA_BOND = toppa(ricolora(TESTA, 'h', 'z'), 0, 0, [
  '            ',
  '    ZZ      ',
  '            ',
  '            ',
  '   KKKKKKKK ',
  '     KKKKKK ',
]);

// Spezza una stringa in 3 fotogrammi di "catena": il motivo si sposta a ogni fotogramma.
function catena(det: number, lung: number, inverso = false) {
  const motivo = 'MMKMMKMMKMMK';
  const s = inverso ? (3 - (det % 3)) % 3 : det % 3;
  return motivo.slice(s, s + lung);
}

const PERSONAGGI: Spec[] = [
  // 1. JASON: altissimo e sottile; maschera bianca da portiere di hockey, motosega (la catena corre).
  {
    id: 'jason',
    nome: 'Jason',
    battuta: 'Presente! Stavolta sì.',
    accento: ['#f08b25', '#b4580f'],
    dettagli: 3,
    testa: TESTA_JASON,
    busto: { larghezze: [8, 8, 8, 8, 8, 8, 8, 8], stile: 'divisa' },
    gambe: { w: 2, n: 10, sp: 3, col: 'g', ombra: 'd', stivale: 'b' },
    davanti(g, p) {
      const ex = p.hx - 1;
      const ey = p.hy - 1;
      incolla(g, [
        'ooooo' + catena(p.det, 8),
        'oyooo' + 'mmmmmmmm',
        'ooooo' + catena(p.det, 8, true),
        'oKKoo',
      ], ex, ey);
      braccio(g, p);
    },
  },
  // 2. LIMONE: un limone in uniforme (la testa è il limone), fischietto al collo, blocco per appunti.
  {
    id: 'limone',
    nome: 'Limone',
    battuta: 'Devo guardare come vi muovete.',
    accento: ['#f4d41c', '#b89a08'],
    dettagli: 1,
    testa: TESTA_LIMONE,
    busto: BUSTO_BASE,
    gambe: VERDE,
    davanti(g, p) {
      incolla(g, [
        '..MMM..',
        'TTTTTTT',
        'TwwwwwT',
        'TwKKKwT',
        'TwwwwwT',
        'TwKKwwT',
        'TwwwwwT',
        'TwKKKwT',
        'TTTTTTT',
      ], p.hx + 1, p.hy - 5);
      braccio(g, p);
    },
  },
  // 3. REAPER: cappuccio scuro, chiave inglese.
  {
    id: 'reaper',
    nome: 'Reaper',
    battuta: 'Istantanèo.',
    accento: ['#3d4452', '#242a35'],
    dettagli: 1,
    testa: TESTA_REAPER,
    busto: BUSTO_BASE,
    gambe: VERDE,
    davanti(g, p) {
      // il cappuccio ricade sulle spalle
      incolla(g, ['AAAAAAAAAA', 'aaaaaaaaaa'], p.x0, p.by, false);
      incolla(g, [
        'MM.MM',
        'MM.MM',
        'MMMMM',
        '.MMM.',
        '.MmM.',
        '.MmM.',
        '.MmM.',
        '.MmM.',
        '.MmM.',
        '.MMM.',
      ], p.hx, p.hy - 9);
      braccio(g, p);
    },
  },
  // 4. FACEMAN: spalle larghissime e gambe corte, un tronco in spalla.
  {
    id: 'faceman',
    nome: 'Faceman',
    battuta: 'Qualcuno mi dà un passaggio?',
    accento: ['#8d5b2c', '#5c3a18'],
    dettagli: 1,
    testa: TESTA_FACEMAN,
    busto: { larghezze: [18, 18, 16, 14, 14, 12, 12], stile: 'divisa' },
    gambe: { w: 4, n: 5, sp: 2, col: 'g', ombra: 'd', stivale: 'b' },
    davanti(g, p) {
      const tronco = [
        'ttTtttttTtttttttTtttTTTT',
        'tttttTtttttttTttttTbbbbT',
        'TtttttttTtttttttttTbTTbT',
        'tttTtttttttTtttttTTbTTbT',
        'ttttttTtttttttttttTTbbTT',
      ];
      incolla(g, tronco, 4, p.by + 2);
      incolla(g, ['ss', 'ss'], p.rx - 6, p.by + 6);
    },
  },
  // 5. KYNNYX: piccolo e velocissimo, scie di velocità, pistola con la punta rossa.
  {
    id: 'kynnyx',
    nome: 'Kynnyx',
    battuta: 'Si è rotta di nuovo.',
    accento: ['#47cbf0', '#1f7fa3'],
    dettagli: 3,
    testa: TESTA_KYNNYX,
    busto: { larghezze: [8, 8, 8, 8], stile: 'divisa' },
    gambe: { w: 2, n: 4, sp: 3, col: 'g', ombra: 'd', stivale: 'b' },
    inclina: 1,
    dietro(g, p) {
      if (p.passo === 2) return;
      const s = (p.det % 3) * 2;
      incolla(g, ['wwwwwww'.slice(s % 3)], 0, p.by, false);
      incolla(g, ['cccccccc'.slice(0, 8 - s % 4)], 1 + s % 3, p.by + 2, false);
      incolla(g, ['wwwww'.slice(0, 5 - (s % 3))], 2, p.by + 4, false);
    },
    davanti(g, p) {
      incolla(g, ['MMMMMrr', 'mmmmm..', 'mm.....', 'mm.....'], p.hx - 1, p.hy);
      braccio(g, p, ['ggg...', 'gGg...', 'ggggss', '..ggss']);
    },
  },
  // 6. RICO: bandana rossa, un candelotto con la miccia accesa (la scintilla lampeggia).
  {
    id: 'rico',
    nome: 'Rico',
    battuta: 'E se lo facessimo esplodere?',
    accento: ['#d83a2f', '#8f1f18'],
    dettagli: 3,
    testa: TESTA_RICO,
    busto: BUSTO_BASE,
    gambe: VERDE,
    dietro(g, p) {
      const volo = p.det % 2 === 0;
      incolla(g, volo ? ['AAA.', '.AAa'] : ['.AAA', 'AAa.'], p.tx - 3, p.ty + 2);
    },
    davanti(g, p) {
      const ax = p.rx - 2;
      const ay = p.by + 1;
      const sx = ax + 5;
      // candelotto
      incolla(g, ['rrre', 'rrre', 'wwww', 'wKKw', 'wwww', 'rrre', 'rrre', 'rrre', 'rrre'], sx, ay - 11);
      incolla(g, ['T', 'T'], sx + 1, ay - 13);
      const scintille = [
        ['.y.', 'yoy', '.y.'],
        ['y.y', '.w.', 'y.y'],
        ['.o.', 'oyo', '.o.'],
      ];
      incolla(g, scintille[p.det % 3], sx, ay - 16, false);
      incolla(g, ['......ss', '......ss', '......gg', '......gg', 'gggggggg', 'gGggggg.', 'ggg.....'], ax, ay - 4);
    },
  },
  // 7. BOND: giacca, cravatta e occhiali da sole; smartphone con lo schermo che si accende.
  {
    id: 'bond',
    nome: 'Bond',
    battuta: 'Io non sono arrabbiato, eh.',
    accento: ['#3b63d6', '#1b2f6e'],
    dettagli: 2,
    testa: TESTA_BOND,
    busto: { larghezze: [10, 10, 10, 10, 10, 10], stile: 'giacca' },
    gambe: { w: 3, n: 6, sp: 3, col: 'z', ombra: 'K', stivale: 'K' },
    davanti(g, p) {
      const acceso = p.det % 2 === 0;
      incolla(g, [
        'zzzz',
        acceso ? 'zccz' : 'zcwz',
        acceso ? 'zccz' : 'zwcz',
        acceso ? 'zccz' : 'zcwz',
        'zzzz',
      ], p.hx + 1, p.hy - 2);
      braccio(g, p, ['zzz...', 'zZz...', 'zzzzss', '..zzss']);
      // la bocca che non sta mai ferma
      if (!acceso) incolla(g, ['KK'], p.tx + 8, p.ty + 6, false);
    },
  },
];

// ── Costruzione dei fotogrammi ──────────────────────────────────────────────────────────────────

/** Un fotogramma: ALT righe di LARG caratteri. */
export function fotogramma(spec: Spec, passo: 0 | 1 | 2, det: number): string[] {
  const g = vuota();
  const { y0 } = gambe(g, spec.gambe, passo);
  const h = spec.busto.larghezze.length;
  const by = y0 - h;
  const ty = by - spec.testa.length;
  const incl = passo === 2 ? 0 : (spec.inclina ?? 0);
  const cx = CENTRO + incl;

  const hxBusto = cx - Math.floor(spec.busto.larghezze[0] / 2);
  const pt: Punti = {
    passo,
    det,
    rx: 0,
    by,
    tx: 0,
    ty,
    hx: 0,
    hy: 0,
    x0: hxBusto,
  };

  // la testa si centra sulla sua larghezza massima
  const largTesta = Math.max(...spec.testa.map((r) => r.length));
  pt.tx = cx - Math.floor(largTesta / 2);
  spec.dietro?.(g, pt);
  const b = busto(g, spec.busto.larghezze, spec.busto.stile, by, cx);
  pt.rx = b.bordoDestro;
  pt.x0 = b.x0;
  incolla(g, spec.testa, pt.tx, ty);
  pt.hx = pt.rx + 2;
  pt.hy = by + 3;
  spec.davanti(g, pt);
  return g.map((r) => r.join(''));
}

export interface Personaggio {
  id: string;
  nome: string;
  battuta: string;
  tavolozza: Record<string, string>;
  /** Fotogrammi della camminata (si ripetono in ordine). */
  marcia: string[][];
  /** Fotogrammi da fermo (solo il dettaglio si muove). */
  fermo: string[][];
  /** Altezza visibile in pixel, per posizionare il fumetto sopra la testa. */
  altezza: number;
}

const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));
const mcm = (a: number, b: number) => (a * b) / mcd(a, b);

function costruisci(spec: Spec): Personaggio {
  const lung = mcm(2, spec.dettagli);
  const marcia = Array.from({ length: lung }, (_, k) => fotogramma(spec, (k % 2) as 0 | 1, k % spec.dettagli));
  const fermo = Array.from({ length: spec.dettagli }, (_, k) => fotogramma(spec, 2, k));
  const primaRiga = fermo[0].findIndex((r) => /[^.]/.test(r));
  return {
    id: spec.id,
    nome: spec.nome,
    battuta: spec.battuta,
    tavolozza: { ...TAVOLOZZA, A: spec.accento[0], a: spec.accento[1] },
    marcia,
    fermo,
    altezza: ALT - primaRiga,
  };
}

/** I sette personaggi nell'ordine della fila (da sinistra a destra); entrano in ordine inverso. */
export const SQUADRA: Personaggio[] = PERSONAGGI.map(costruisci);

/** Il terreno: una piastrella 16x6 che si ripete. */
export const TERRENO = [
  'GgGGgGGgGGgGGgGG',
  'gdggggdgggggdggg',
  'ttTtttttTtttttTt',
  'tttbtttttttbtttt',
  'btttttTtbtttttTt',
  'bbbbbbbbbbbbbbbb',
];

/** Freccia "avanti" che lampeggia alla fine della scena. */
export const FRECCIA = [
  '.......yy.....',
  '.......yyy....',
  'yyyyyyyyyyy...',
  'yyyyyyyyyyyy..',
  'yyyyyyyyyyyyy.',
  'yyyyyyyyyyyy..',
  'yyyyyyyyyyy...',
  '.......yyy....',
  '.......yy.....',
];

export const MESSAGGI = {
  titolo: 'Missione: presentarsi',
  fine: 'Missione compiuta',
  annuncio: 'Easter egg: la squadra si presenta. Premi Esc per chiudere.',
};
