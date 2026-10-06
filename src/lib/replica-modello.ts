import * as THREE from 'three';

// Modello 3D schematico di una replica tipo M4 / AR-15, costruito interamente in codice.
// Unità: 1 = 1 cm. Asse X lungo la canna (la volata è verso +X), Y verso l'alto,
// Z verso il lato destro del tiratore. Le parti piatte nascono da profili 2D nel piano XY
// estrusi lungo Z; quelle tonde sono cilindri.
// Il modello è stilizzato: le repliche vere variano da marca a marca.

export type Tono = 'corpo' | 'plastica' | 'ferro' | 'scuro' | 'rosso';
export type Stato = 'normale' | 'attenuato' | 'evidenziato';
/** Da dove guardare la parte quando la si seleziona dall'elenco. */
export type Lato = 'auto' | 'dx' | 'sx';

/** Colori del sito già convertiti in sRGB (vedi leggiTavolozza in Replica3D.tsx). */
export interface Tavolozza {
  card: THREE.Color;
  foreground: THREE.Color;
  primary: THREE.Color;
  destructive: THREE.Color;
}

interface Oggetto {
  mesh: THREE.Mesh;
  tono: Tono;
  liscio: boolean;
  linee?: THREE.LineSegments;
  guscio?: THREE.Mesh;
}

export interface Parte {
  id: string;
  gruppo: THREE.Group;
  /** Spostamento (cm) della vista esplosa. */
  esplosione: THREE.Vector3;
  lato: Lato;
  /** Ingombro a riposo, in coordinate della scena. */
  misura: THREE.Box3;
  oggetti: Oggetto[];
}

export interface Replica {
  radice: THREE.Group;
  elenco: Parte[];
  parti: Map<string, Parte>;
  /** Mesh su cui fare il raycasting (parti visibili e aree cliccabili invisibili). */
  cliccabili: THREE.Mesh[];
  misuraRiposo: THREE.Box3;
  misuraEsplosa: THREE.Box3;
  impostaColori(t: Tavolozza): void;
  evidenzia(id: string | null): void;
  /** 0 = assemblato, 1 = vista esplosa. */
  esplodi(valore: number): void;
  /** Centro della parte nella scena, tenendo conto della vista esplosa. */
  centroParte(id: string, fuori?: THREE.Vector3): THREE.Vector3;
  dimensioniParte(id: string, fuori?: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

type Pt = [number, number, number?];

// ── Utilità di geometria ─────────────────────────────────────────────────

/** Poligono 2D con gli spigoli arrotondati: ogni punto può avere il proprio raggio (terzo valore). */
function sagoma(punti: Pt[], r0 = 0): THREE.Shape {
  const n = punti.length;
  const v = punti.map(([x, y]) => new THREE.Vector2(x, y));
  const tratti = v.map((p, i) => {
    const r = punti[i]?.[2] ?? r0;
    const prec = v[(i + n - 1) % n]!;
    const succ = v[(i + 1) % n]!;
    const d1 = prec.clone().sub(p);
    const d2 = succ.clone().sub(p);
    const rr = Math.min(r, d1.length() / 2, d2.length() / 2);
    if (rr <= 1e-6) return { a: p, b: p, p, curva: false };
    return {
      a: p.clone().add(d1.normalize().multiplyScalar(rr)),
      b: p.clone().add(d2.normalize().multiplyScalar(rr)),
      p,
      curva: true,
    };
  });
  const s = new THREE.Shape();
  const primo = tratti[0]!;
  s.moveTo(primo.b.x, primo.b.y);
  for (let i = 1; i < n; i++) {
    const t = tratti[i]!;
    s.lineTo(t.a.x, t.a.y);
    if (t.curva) s.quadraticCurveTo(t.p.x, t.p.y, t.b.x, t.b.y);
  }
  if (primo.curva) {
    s.lineTo(primo.a.x, primo.a.y);
    s.quadraticCurveTo(primo.p.x, primo.p.y, primo.b.x, primo.b.y);
  }
  return s;
}

/** Profilo 2D estruso lungo Z (centrato su Z = 0), con un piccolo smusso. */
function estrusione(punti: Pt[], spessore: number, r0 = 0.25, smusso = 0.12): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(sagoma(punti, r0), {
    depth: spessore,
    bevelEnabled: smusso > 0,
    bevelThickness: smusso,
    bevelSize: smusso,
    bevelSegments: 1,
    curveSegments: 5,
  });
  g.translate(0, 0, -spessore / 2);
  return g;
}

/** Cilindro centrato nell'origine, con l'asse lungo X, Y o Z. */
function cilindro(r: number, lunghezza: number, asse: 'x' | 'y' | 'z' = 'x', segmenti = 24, rotazione = 0): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(r, r, lunghezza, segmenti, 1);
  if (rotazione) g.rotateY(rotazione);
  if (asse === 'x') g.rotateZ(-Math.PI / 2);
  else if (asse === 'z') g.rotateX(Math.PI / 2);
  return g;
}

/** Linea spezzata liscia che passa per i punti dati. */
function curva(punti: Pt[], campioni = 18): Pt[] {
  const c = new THREE.CatmullRomCurve3(punti.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  return c.getPoints(campioni).map((p) => [p.x, p.y] as Pt);
}

/** Nastro di larghezza w attorno a una linea (grilletto, ponticello). */
function nastro(centro: Pt[], w: number, rEstremi = 0.25): Pt[] {
  const sx: Pt[] = [];
  const dx: Pt[] = [];
  centro.forEach((p, i) => {
    const a = centro[Math.max(0, i - 1)]!;
    const b = centro[Math.min(centro.length - 1, i + 1)]!;
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    const nx = -ty / l;
    const ny = tx / l;
    sx.push([p[0] + (nx * w) / 2, p[1] + (ny * w) / 2]);
    dx.push([p[0] - (nx * w) / 2, p[1] - (ny * w) / 2]);
  });
  const pts = [...sx, ...dx.reverse()];
  // Solo i quattro angoli delle estremità vengono arrotondati.
  const n = centro.length;
  [0, n - 1, n, 2 * n - 1].forEach((i) => {
    const p = pts[i];
    if (p) p[2] = rEstremi;
  });
  return pts;
}

/** Profilo della slitta Picatinny, con i denti (passo 1 cm). */
function profiloSlitta(x0: number, x1: number, yBase: number, yRadice: number, yDente: number): Pt[] {
  const pts: Pt[] = [
    [x0, yBase],
    [x0, yRadice],
  ];
  const denti = Math.floor(x1 - x0 - 0.5);
  for (let i = 0; i < denti; i++) {
    const l = x0 + 0.5 + i;
    const r = l + 0.48;
    pts.push([l, yRadice], [l, yDente], [r, yDente], [r, yRadice]);
  }
  pts.push([x1, yRadice], [x1, yBase]);
  return pts;
}

/** Caricatore leggermente curvo in avanti. */
function profiloCaricatore(): Pt[] {
  const N = 14;
  const fronte: Pt[] = [];
  const retro: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const y = -2.2 - 15.8 * s;
    const xc = 41.6 + 4.4 * s * s;
    const hw = 3.15 - 0.3 * s;
    fronte.push([xc + hw, y]);
    retro.push([xc - hw, y]);
  }
  retro.reverse();
  // Angoli arrotondati alla base.
  fronte[N]![2] = 0.5;
  retro[0]![2] = 0.5;
  return [...fronte, ...retro];
}

// ── Costruzione ──────────────────────────────────────────────────────────

const STATI: Stato[] = ['normale', 'attenuato', 'evidenziato'];

export function costruisciReplica(): Replica {
  const radice = new THREE.Group();
  radice.name = 'replica';
  const geometrie = new Set<THREE.BufferGeometry>();
  const elenco: Parte[] = [];
  const parti = new Map<string, Parte>();
  const cliccabili: THREE.Mesh[] = [];

  // Materiali: opachi e piatti, tre stati (normale, attenuato, evidenziato) per ogni tono.
  const materiali = new Map<string, Record<Stato, THREE.MeshStandardMaterial>>();
  const materialiParti = (tono: Tono, liscio: boolean) => {
    const chiave = `${tono}:${liscio ? 'l' : 'p'}`;
    let set = materiali.get(chiave);
    if (!set) {
      const crea = () =>
        new THREE.MeshStandardMaterial({
          roughness: 1,
          metalness: 0,
          flatShading: !liscio,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
      set = { normale: crea(), attenuato: crea(), evidenziato: crea() };
      materiali.set(chiave, set);
    }
    return set;
  };
  const linee = Object.fromEntries(STATI.map((s) => [s, new THREE.LineBasicMaterial()])) as Record<Stato, THREE.LineBasicMaterial>;
  const gusci = Object.fromEntries(
    STATI.map((s) => [s, new THREE.MeshBasicMaterial({ side: THREE.BackSide })]),
  ) as Record<Stato, THREE.MeshBasicMaterial>;
  const materialeHit = new THREE.MeshBasicMaterial({ visible: false });

  const reg = <G extends THREE.BufferGeometry>(g: G): G => {
    geometrie.add(g);
    return g;
  };

  const nuovaParte = (id: string, esplosione: [number, number, number], lato: Lato = 'auto'): Parte => {
    const p: Parte = {
      id,
      gruppo: new THREE.Group(),
      esplosione: new THREE.Vector3(...esplosione),
      lato,
      misura: new THREE.Box3(),
      oggetti: [],
    };
    p.gruppo.name = id;
    p.gruppo.userData.id = id;
    radice.add(p.gruppo);
    elenco.push(p);
    parti.set(id, p);
    return p;
  };

  interface Opzioni {
    pos?: [number, number, number];
    rotZ?: number;
    liscio?: boolean;
    /** 'spigoli': linee sugli spigoli vivi; 'guscio': contorno a sagoma per le forme tonde; 'nessuno'. */
    bordo?: 'spigoli' | 'guscio' | 'nessuno';
    guscio?: THREE.BufferGeometry;
  }

  const nonCliccabile = function (this: THREE.Object3D) {
    /* i contorni non partecipano al raycasting */
  };

  const aggiungi = (p: Parte, geo: THREE.BufferGeometry, tono: Tono, o: Opzioni = {}) => {
    const liscio = o.liscio ?? false;
    const mesh = new THREE.Mesh(reg(geo), materialiParti(tono, liscio).normale);
    mesh.userData.id = p.id;
    const posiziona = (oggetto: THREE.Object3D) => {
      if (o.pos) oggetto.position.set(...o.pos);
      if (o.rotZ) oggetto.rotation.z = o.rotZ;
    };
    posiziona(mesh);
    p.gruppo.add(mesh);
    cliccabili.push(mesh);
    const ogg: Oggetto = { mesh, tono, liscio };
    const bordo = o.bordo ?? (o.guscio ? 'guscio' : 'spigoli');
    if (bordo === 'spigoli' || bordo === 'guscio') {
      const l = new THREE.LineSegments(reg(new THREE.EdgesGeometry(geo, 28)), linee.normale);
      l.raycast = nonCliccabile;
      posiziona(l);
      p.gruppo.add(l);
      ogg.linee = l;
    }
    if (bordo === 'guscio' && o.guscio) {
      const g = new THREE.Mesh(reg(o.guscio), gusci.normale);
      g.raycast = nonCliccabile;
      posiziona(g);
      p.gruppo.add(g);
      ogg.guscio = g;
    }
    p.oggetti.push(ogg);
    return mesh;
  };

  /** Cilindro con contorno a sagoma (il contorno ingrossato visto da dietro). */
  const aggiungiCilindro = (
    p: Parte,
    tono: Tono,
    r: number,
    lunghezza: number,
    asse: 'x' | 'y' | 'z',
    pos: [number, number, number],
    o: { rotZ?: number; segmenti?: number } = {},
  ) => {
    const seg = o.segmenti ?? 24;
    return aggiungi(p, cilindro(r, lunghezza, asse, seg), tono, {
      pos,
      rotZ: o.rotZ,
      liscio: true,
      guscio: cilindro(r + 0.11, lunghezza + 0.22, asse, seg),
    });
  };

  /** Area cliccabile invisibile e più grande della parte, per i pezzi piccoli. */
  const aggiungiHit = (p: Parte, geo: THREE.BufferGeometry, pos: [number, number, number]) => {
    const m = new THREE.Mesh(reg(geo), materialeHit);
    m.position.set(...pos);
    m.userData.id = p.id;
    m.userData.hit = true;
    p.gruppo.add(m);
    cliccabili.push(m);
  };

  // ── 1. Canna ───────────────────────────────────────────────────────────
  {
    const p = nuovaParte('spegnifiamma', [24, 0, 0]);
    aggiungiCilindro(p, 'ferro', 1.35, 0.8, 'x', [77.4, 0, 0]);
    aggiungiCilindro(p, 'ferro', 1.2, 3.0, 'x', [79.3, 0, 0]);
    aggiungiCilindro(p, 'ferro', 1.3, 0.3, 'x', [78.7, 0, 0]);
    aggiungiCilindro(p, 'ferro', 1.3, 0.3, 'x', [79.9, 0, 0]);
    // Punta rossa: 3,2 cm, come richiede la legge.
    aggiungiCilindro(p, 'rosso', 1.2, 3.2, 'x', [82.4, 0, 0]);
    aggiungiHit(p, cilindro(1.9, 7.4, 'x', 8), [80.7, 0, 0]);
  }
  {
    const p = nuovaParte('canna-esterna', [12, 0, 0]);
    aggiungiCilindro(p, 'ferro', 0.95, 30.6, 'x', [61.7, 0, 0], { segmenti: 20 });
    // Area cliccabile più larga sul tratto visibile della canna, che è sottile.
    aggiungiHit(p, cilindro(1.9, 13, 'x', 8), [70.5, 0, 0]);
  }
  {
    const p = nuovaParte('mirino-anteriore', [13, 8, 0]);
    aggiungi(
      p,
      estrusione(
        [
          [64.2, -1.35],
          [68.8, -1.35],
          [68.8, 0.7],
          [67.4, 1.8],
          [66.9, 4.6],
          [65.9, 4.6],
          [65.4, 1.8],
          [64.2, 0.7],
        ],
        1.9,
        0.25,
      ),
      'ferro',
    );
    aggiungiCilindro(p, 'ferro', 0.25, 1.5, 'y', [66.4, 5.35, 0], { segmenti: 12 });
  }
  {
    const p = nuovaParte('astina', [6, -9, 0]);
    // Ottagono con una faccia piatta in alto, dove poggia la slitta.
    aggiungi(p, cilindro(3.03, 17.6, 'x', 8, Math.PI / 8), 'corpo', { pos: [55.2, 0, 0] });
    aggiungiCilindro(p, 'ferro', 3.4, 1.4, 'x', [47.1, 0, 0], { segmenti: 20 });
    aggiungiCilindro(p, 'ferro', 3.2, 0.8, 'x', [63.6, 0, 0], { segmenti: 20 });
    // Asole decorative sulle facce laterali.
    for (const [x, l] of [
      [51.6, 3.6],
      [56.7, 3.6],
      [61.0, 2.8],
    ] as const) {
      for (const z of [-2.83, 2.83]) {
        aggiungi(p, new THREE.BoxGeometry(l, 0.8, 0.12), 'scuro', { pos: [x, 0, z], bordo: 'nessuno' });
      }
    }
  }

  // ── 2. Corpo ───────────────────────────────────────────────────────────
  {
    const p = nuovaParte('upper-receiver', [0, 5, 0]);
    aggiungi(
      p,
      estrusione(
        [
          [27.0, -1.6, 0.4],
          [46.4, -1.6, 0.15],
          [46.4, 2.8, 0.15],
          [28.2, 2.8, 0.3],
          [27.0, 2.1, 0.5],
        ],
        4.2,
      ),
      'corpo',
    );
  }
  {
    const p = nuovaParte('slitta-superiore', [3, 12, 0]);
    aggiungi(p, estrusione(profiloSlitta(27.8, 64.0, 2.4, 3.3, 3.8), 2.1, 0, 0.05), 'ferro');
    aggiungiHit(p, new THREE.BoxGeometry(31, 1.6, 2.6), [48.5, 3.6, 0]);
  }
  {
    const p = nuovaParte('tacca-di-mira', [-3, 17, 0]);
    aggiungi(
      p,
      estrusione(
        [
          [28.2, 3.4],
          [31.6, 3.4],
          [31.6, 4.7],
          [28.2, 4.7],
        ],
        2.1,
        0.3,
      ),
      'ferro',
    );
    aggiungi(
      p,
      estrusione(
        [
          [29.0, 4.6],
          [31.0, 4.6],
          [31.0, 6.6],
          [29.0, 6.6],
        ],
        1.4,
        0.4,
      ),
      'ferro',
    );
    aggiungiCilindro(p, 'scuro', 0.55, 2.2, 'x', [30.0, 5.7, 0], { segmenti: 14 });
  }
  {
    const p = nuovaParte('manetta', [-10, 9, 0], 'sx');
    const latta: Pt[] = [
      [27.2, 0.7],
      [24.4, 0.7],
      [23.6, 1.5],
      [23.6, 2.7],
      [27.2, 2.7],
    ];
    for (const z of [-2.45, 2.45]) aggiungi(p, estrusione(latta, 0.9, 0.2, 0.1), 'ferro', { pos: [0, 0, z] });
    aggiungi(p, new THREE.BoxGeometry(1.5, 2.0, 5.8), 'ferro', { pos: [24.35, 1.7, 0] });
    aggiungiHit(p, new THREE.BoxGeometry(5, 3.4, 7.2), [25.4, 1.7, 0]);
  }
  {
    const p = nuovaParte('sportellino', [2, 4, 12], 'dx');
    aggiungi(
      p,
      estrusione(
        [
          [33.0, -1.2],
          [41.6, -1.2],
          [41.6, 1.9],
          [33.8, 1.9],
          [33.0, 1.2],
        ],
        0.35,
        0.4,
        0.06,
      ),
      'ferro',
      { pos: [0, 0, 2.4] },
    );
  }
  {
    const p = nuovaParte('forward-assist', [-6, 6, 12], 'dx');
    aggiungiCilindro(p, 'ferro', 1.05, 0.9, 'z', [31.6, 0.8, 2.65], { segmenti: 20 });
    // Il pistone punta all'indietro, leggermente verso il basso.
    aggiungiCilindro(p, 'ferro', 0.5, 3.6, 'x', [29.86, 0.33, 2.65], { rotZ: (15 * Math.PI) / 180, segmenti: 14 });
    aggiungiHit(p, new THREE.SphereGeometry(2.2, 10, 8), [30.4, 0.6, 2.9]);
  }
  {
    const p = nuovaParte('lower-receiver', [0, -4, 0]);
    aggiungi(
      p,
      estrusione(
        [
          [25.0, 0.4, 0.25],
          [27.0, 0.4, 0.2],
          [27.0, -1.4],
          [45.5, -1.4, 0.3],
          [45.3, -3.0, 0.5],
          [44.9, -6.4, 0.4],
          [38.2, -6.4, 0.35],
          [38.2, -3.7, 0.25],
          [26.0, -3.7],
          [25.0, -3.2, 0.4],
        ],
        3.8,
      ),
      'corpo',
    );
  }

  // ── 3. Comandi ─────────────────────────────────────────────────────────
  {
    const p = nuovaParte('selettore', [3, -4, -11], 'sx');
    aggiungiCilindro(p, 'ferro', 0.85, 1.0, 'z', [30.4, -2.4, -2.5], { segmenti: 18 });
    aggiungiCilindro(p, 'ferro', 0.8, 0.3, 'z', [30.4, -2.4, 2.2], { segmenti: 18 });
    // Levetta, rivolta in avanti e leggermente in alto.
    aggiungi(p, new THREE.BoxGeometry(2.8, 0.6, 0.5), 'ferro', {
      pos: [31.53, -1.99, -3.15],
      rotZ: (20 * Math.PI) / 180,
    });
    aggiungiHit(p, new THREE.SphereGeometry(1.9, 10, 8), [30.9, -2.3, -2.7]);
  }
  {
    const p = nuovaParte('grilletto', [2, -10, 0]);
    aggiungi(
      p,
      estrusione(
        nastro(
          curva(
            [
              [36.0, -3.6],
              [36.25, -4.8],
              [35.9, -5.9],
              [35.0, -6.5],
            ],
            10,
          ),
          0.7,
        ),
        0.7,
        0,
        0.08,
      ),
      'ferro',
    );
    aggiungiHit(p, new THREE.BoxGeometry(2.6, 3.6, 1.6), [35.6, -5.0, 0]);
  }
  {
    const p = nuovaParte('ponticello', [5, -14, 0]);
    aggiungi(
      p,
      estrusione(
        nastro(
          curva(
            [
              [38.4, -5.8],
              [37.9, -7.2],
              [36.8, -8.0],
              [34.8, -8.3],
              [33.3, -7.9],
              [32.6, -7.3],
            ],
            16,
          ),
          0.6,
          0.2,
        ),
        1.0,
        0,
        0.08,
      ),
      'corpo',
    );
  }
  {
    const p = nuovaParte('impugnatura', [-9, -11, 0]);
    aggiungi(
      p,
      estrusione(
        [
          [33.5, -3.0, 0.2],
          [33.4, -5.0, 0.5],
          [32.6, -8.0, 1.2],
          [31.6, -11.5, 1.0],
          [29.0, -16.2, 0.6],
          [23.6, -16.2, 0.6],
          [24.6, -12.5, 1.2],
          [26.0, -8.2, 1.5],
          [26.8, -5.2, 1.5],
          [26.0, -3.0, 0.3],
        ],
        3.4,
      ),
      'plastica',
    );
  }
  {
    const p = nuovaParte('leva-otturatore', [4, -3, -11], 'sx');
    aggiungi(
      p,
      estrusione(
        [
          [39.4, -1.5, 0.1],
          [43.0, -1.5, 0.1],
          [43.0, -2.5, 0.3],
          [42.2, -3.4, 0.3],
          [41.0, -3.4, 0.3],
          [40.8, -2.4, 0.3],
          [39.4, -2.3, 0.1],
        ],
        0.5,
        0.1,
        0.06,
      ),
      'ferro',
      { pos: [0, 0, -2.3] },
    );
    aggiungiHit(p, new THREE.BoxGeometry(5, 3.4, 2.4), [41.2, -2.5, -2.6]);
  }

  // ── 4. Alimentazione ───────────────────────────────────────────────────
  {
    const p = nuovaParte('caricatore', [9, -17, 0]);
    aggiungi(p, estrusione(profiloCaricatore(), 2.8, 0.2), 'plastica');
  }
  {
    const p = nuovaParte('sgancio-caricatore', [3, -4, 12], 'dx');
    aggiungiCilindro(p, 'ferro', 0.75, 1.0, 'z', [39.7, -4.5, 2.5], { segmenti: 18 });
    aggiungiHit(p, new THREE.SphereGeometry(1.9, 10, 8), [39.7, -4.5, 2.8]);
  }

  // ── 5. Calcio ──────────────────────────────────────────────────────────
  {
    const p = nuovaParte('tubo-calcio', [-10, 0, 0]);
    aggiungiCilindro(p, 'ferro', 1.5, 14.2, 'x', [17.1, -1.1, 0]);
    aggiungiCilindro(p, 'corpo', 1.95, 0.8, 'x', [24.6, -1.1, 0]);
  }
  {
    const p = nuovaParte('calcio', [-22, -2, 0]);
    aggiungi(
      p,
      estrusione(
        [
          [0.0, 1.2, 0.5],
          [0.6, 2.3, 0.8],
          [8.0, 2.5, 1.0],
          [17.0, 1.6, 0.3],
          [17.0, -3.8, 0.3],
          [12.0, -4.4, 1.0],
          [6.5, -8.0, 1.2],
          [2.0, -11.4, 1.0],
          [0.0, -11.4, 0.5],
        ],
        4.0,
      ),
      'plastica',
    );
    // Gommino del calcio.
    aggiungi(p, new THREE.BoxGeometry(1.15, 12.0, 4.1), 'scuro', { pos: [0.425, -5.0, 0] });
  }
  {
    const p = nuovaParte('attacco-cinghia', [-9, -9, -7]);
    aggiungi(p, new THREE.BoxGeometry(1.2, 0.9, 1.6), 'ferro', { pos: [24.6, -3.3, 0] });
    aggiungi(p, new THREE.TorusGeometry(0.75, 0.2, 8, 18), 'ferro', {
      pos: [24.6, -4.3, 0],
      liscio: true,
      guscio: new THREE.TorusGeometry(0.75, 0.31, 8, 18),
    });
    aggiungiHit(p, new THREE.SphereGeometry(2.0, 10, 8), [24.6, -4.0, 0]);
  }

  // ── Ingombri e centratura ──────────────────────────────────────────────
  radice.updateMatrixWorld(true);
  const misuraRiposo = new THREE.Box3();
  for (const p of elenco) {
    for (const o of p.oggetti) p.misura.union(new THREE.Box3().setFromObject(o.mesh));
    misuraRiposo.union(p.misura);
  }
  const centro = misuraRiposo.getCenter(new THREE.Vector3());
  radice.position.copy(centro).negate();
  radice.updateMatrixWorld(true);
  misuraRiposo.translate(radice.position);
  const misuraEsplosa = new THREE.Box3();
  for (const p of elenco) {
    p.misura.translate(radice.position);
    misuraEsplosa.union(p.misura.clone().translate(p.esplosione));
  }

  const applica = (selezionata: string | null) => {
    for (const p of elenco) {
      const stato: Stato = selezionata === null ? 'normale' : p.id === selezionata ? 'evidenziato' : 'attenuato';
      for (const o of p.oggetti) {
        // La punta rossa resta rossa in ogni caso: è un obbligo di legge, non un dettaglio.
        const set = materialiParti(o.tono, o.liscio);
        o.mesh.material = set[o.tono === 'rosso' ? 'normale' : stato];
        if (o.linee) o.linee.material = linee[stato];
        if (o.guscio) o.guscio.material = gusci[stato];
      }
    }
  };

  return {
    radice,
    elenco,
    parti,
    cliccabili,
    misuraRiposo,
    misuraEsplosa,

    impostaColori(t) {
      // Miscela in sRGB (non in spazio lineare): i toni restano distinti sia sul tema chiaro sia su quello scuro.
      const mix = (a: THREE.Color, b: THREE.Color, k: number) => {
        const p = a.getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
        const q = b.getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
        return new THREE.Color().setRGB(p.r + (q.r - p.r) * k, p.g + (q.g - p.g) * k, p.b + (q.b - p.b) * k, THREE.SRGBColorSpace);
      };
      // Sul tema scuro i toni vanno più verso il chiaro, per staccarsi dallo sfondo.
      const notturno = t.card.r + t.card.g + t.card.b < 1.2;
      const k = notturno ? { corpo: 0.5, plastica: 0.55, ferro: 0.72, scuro: 0.92 } : { corpo: 0.22, plastica: 0.45, ferro: 0.48, scuro: 0.8 };
      const base: Record<Tono, THREE.Color> = {
        corpo: mix(t.card, t.foreground, k.corpo),
        plastica: mix(t.card, t.primary, k.plastica),
        ferro: mix(t.card, t.foreground, k.ferro),
        scuro: mix(t.card, t.foreground, k.scuro),
        rosso: t.destructive.clone(),
      };
      for (const [chiave, set] of materiali) {
        const tono = chiave.split(':')[0] as Tono;
        const fisso = tono === 'rosso' || tono === 'scuro';
        set.normale.color.copy(base[tono]);
        set.attenuato.color.copy(tono === 'rosso' ? base[tono] : mix(base[tono], t.card, 0.5));
        set.evidenziato.color.copy(fisso ? base[tono] : t.primary);
        set.evidenziato.emissive.copy(fisso ? new THREE.Color(0, 0, 0) : t.primary).multiplyScalar(fisso ? 1 : 0.3);
        for (const s of STATI) set[s].needsUpdate = true;
      }
      linee.normale.color.copy(t.primary);
      linee.attenuato.color.copy(mix(t.primary, t.card, 0.6));
      linee.evidenziato.color.copy(t.foreground);
      for (const s of STATI) gusci[s].color.copy(linee[s].color);
    },

    evidenzia: applica,

    esplodi(valore) {
      for (const p of elenco) p.gruppo.position.copy(p.esplosione).multiplyScalar(valore);
      radice.updateMatrixWorld(true);
    },

    centroParte(id, fuori = new THREE.Vector3()) {
      const p = parti.get(id);
      if (!p) return fuori.set(0, 0, 0);
      return p.misura.getCenter(fuori).add(p.gruppo.position);
    },

    dimensioniParte(id, fuori = new THREE.Vector3()) {
      const p = parti.get(id);
      if (!p) return fuori.set(0, 0, 0);
      return p.misura.getSize(fuori);
    },

    dispose() {
      for (const g of geometrie) g.dispose();
      for (const set of materiali.values()) for (const s of STATI) set[s].dispose();
      for (const s of STATI) {
        linee[s].dispose();
        gusci[s].dispose();
      }
      materialeHit.dispose();
      radice.clear();
    },
  };
}
