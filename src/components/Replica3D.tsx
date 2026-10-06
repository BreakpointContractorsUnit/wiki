import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowCounterClockwiseIcon,
  ArrowsOutCardinalIcon,
  MinusIcon,
  PlusIcon,
  WarningIcon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Modello 3D interattivo di una replica tipo M4, con l'elenco delle parti (data/replica.json).
// three.js si carica solo nel browser, dopo il primo rendering (import dinamico): l'elenco è HTML vero
// e funziona anche senza JavaScript o senza WebGL (senza JavaScript il testo di ogni parte si legge nell'elenco;
// dopo l'idratazione lo mostra la scheda sotto il visore). Il modello è in src/lib/replica-modello.ts.
// Le parti si numerano per posizione nell'array di data/replica.json, che deve tenere contigue le voci dello
// stesso gruppo, nell'ordine di GRUPPI.

export interface ParteReplica {
  id: string;
  nome: string;
  gruppo: string;
  testo: string;
  occhio?: string;
}

const GRUPPI: { id: string; titolo: string }[] = [
  { id: 'canna', titolo: 'Canna' },
  { id: 'corpo', titolo: 'Corpo' },
  { id: 'comandi', titolo: 'Comandi' },
  { id: 'alimentazione', titolo: 'Alimentazione' },
  { id: 'calcio', titolo: 'Calcio' },
];

type StatoModello = 'caricamento' | 'pronto' | 'errore';
type NomeVista = 'dx' | 'sx' | 'alto' | 'reset';

interface Motore {
  seleziona(id: string | null, conCamera: boolean): void;
  vista(nome: NomeVista): void;
  esplodi(acceso: boolean): void;
  zoom(fattore: number): void;
  reimposta(): void;
  dispose(): void;
}

type ModuloThree = typeof import('three');
type ModuloControlli = typeof import('three/examples/jsm/controls/OrbitControls.js');
type ModuloModello = typeof import('@/lib/replica-modello');

const ETICHETTA_BREVE = (nome: string) => nome.split(' (')[0] ?? nome;
const numero = (i: number) => String(i + 1).padStart(2, '0');

// ── Motore 3D ────────────────────────────────────────────────────────────

/** Legge un colore del sito (variabile CSS in oklch) e lo converte in sRGB passando da un canvas 1x1. */
function leggiTavolozza(THREE: ModuloThree): import('@/lib/replica-modello').Tavolozza {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const stile = getComputedStyle(document.documentElement);
  const SENTINELLA = '#ff00ff';
  const colore = (variabile: string, riserva: string) => {
    const valore = stile.getPropertyValue(variabile).trim();
    if (!ctx) return new THREE.Color(riserva);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = SENTINELLA;
    ctx.fillStyle = valore || riserva;
    if (ctx.fillStyle === SENTINELLA) ctx.fillStyle = riserva; // valore non riconosciuto dal browser
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  };
  return {
    card: colore('--card', '#f6f5ec'),
    foreground: colore('--foreground', '#232617'),
    primary: colore('--primary', '#4a5a1c'),
    destructive: colore('--destructive', '#b42318'),
  };
}

interface Elementi {
  host: HTMLElement;
  etichetta: HTMLElement;
  bolla: HTMLElement;
}

interface Callback {
  onSelezione(id: string | null): void;
  onZoomAttivo(attivo: boolean): void;
  /** Il browser ha tolto il contesto WebGL: può ancora tornare. */
  onContestoPerso(): void;
  onContestoRipristinato(): void;
}

function creaMotore(
  THREE: ModuloThree,
  controlli: ModuloControlli,
  modello: ModuloModello,
  el: Elementi,
  cb: Callback,
): Motore {
  // Se WebGL non c'è, questo lancia: lo gestisce il chiamante.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:grab';
  el.host.appendChild(canvas);
  try {
    return avviaMotore(THREE, controlli, modello, el, cb, renderer);
  } catch (errore) {
    // La costruzione è fallita a metà: si rilasciano renderer e canvas prima di rilanciare l'errore,
    // così non resta un contesto WebGL allocato.
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    throw errore;
  }
}

function avviaMotore(
  THREE: ModuloThree,
  { OrbitControls }: ModuloControlli,
  modello: ModuloModello,
  el: Elementi,
  cb: Callback,
  renderer: InstanceType<ModuloThree['WebGLRenderer']>,
): Motore {
  const { host } = el;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = renderer.domElement;

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 700);
  scena.add(camera);
  // Le luci seguono la camera: il modello è illuminato allo stesso modo da qualunque lato lo si guardi.
  scena.add(new THREE.AmbientLight(0xffffff, 1.3));
  const luce = new THREE.DirectionalLight(0xffffff, 1.9);
  luce.position.set(0.8, 1.6, 2.4);
  luce.target.position.set(0, 0, -10);
  camera.add(luce, luce.target);

  const replica = modello.costruisciReplica();
  scena.add(replica.radice);
  replica.impostaColori(leggiTavolozza(THREE));

  const controlli = new OrbitControls(camera, canvas);
  controlli.enableDamping = !ridotto.matches;
  // L'inerzia segue la preferenza «riduci movimento» anche se cambia mentre la pagina è aperta.
  const alCambioMovimento = () => {
    controlli.enableDamping = !ridotto.matches;
  };
  ridotto.addEventListener('change', alCambioMovimento);
  controlli.dampingFactor = 0.12;
  controlli.enablePan = false;
  controlli.minDistance = 14;
  controlli.maxDistance = 260;
  controlli.rotateSpeed = 0.8;
  controlli.zoomSpeed = 0.8;
  controlli.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  // Dopo OrbitControls, che imposta touch-action: none: il trascinamento verticale con un dito scorre la pagina.
  canvas.style.touchAction = 'pan-y';

  // ── Ridisegno a richiesta ──
  let distrutto = false;
  let inVista = true;
  let schedaVisibile = document.visibilityState === 'visible';
  let rAF = 0;
  let sporco = true;
  let selezionata: string | null = null;
  let esploso = false;
  let esplosione = 0; // valore corrente della vista esplosa, da 0 a 1
  let interagito = false;
  let ultimaVista: NomeVista = 'reset';
  let larghezza = 0;
  let altezza = 0;

  type Tween = {
    inizio: number;
    durata: number;
    da: { raggio: number; theta: number; phi: number; bersaglio: InstanceType<ModuloThree['Vector3']> };
    a: { raggio: number; theta: number; phi: number; bersaglio: InstanceType<ModuloThree['Vector3']> };
  };
  let tween: Tween | null = null;
  let tweenEsplosione: { inizio: number; durata: number; da: number; a: number } | null = null;

  const invalida = () => {
    sporco = true;
    if (!distrutto && !rAF && inVista && schedaVisibile) rAF = requestAnimationFrame(ciclo);
  };

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const sferico = (offset: InstanceType<ModuloThree['Vector3']>) => new THREE.Spherical().setFromVector3(offset);

  const applica = (raggio: number, theta: number, phi: number, bersaglio: InstanceType<ModuloThree['Vector3']>) => {
    controlli.target.copy(bersaglio);
    camera.position.copy(bersaglio).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(raggio, phi, theta)));
  };

  /** Porta la camera a guardare `bersaglio` da `direzione` (versore) alla distanza data. */
  const portaA = (direzione: InstanceType<ModuloThree['Vector3']>, distanza: number, bersaglio: InstanceType<ModuloThree['Vector3']>, anima: boolean) => {
    const sa = sferico(camera.position.clone().sub(controlli.target));
    const sb = sferico(direzione.clone().multiplyScalar(distanza));
    sb.radius = limita(distanza, controlli.minDistance, controlli.maxDistance);
    if (!anima || ridotto.matches) {
      tween = null;
      applica(sb.radius, sb.theta, sb.phi, bersaglio);
      controlli.update();
      invalida();
      return;
    }
    // Rotazione per la via più breve attorno all'asse verticale.
    const d = ((((sb.theta - sa.theta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    tween = {
      inizio: performance.now(),
      durata: 650,
      da: { raggio: sa.radius, theta: sa.theta, phi: sa.phi, bersaglio: controlli.target.clone() },
      a: { raggio: sb.radius, theta: sa.theta + d, phi: sb.phi, bersaglio: bersaglio.clone() },
    };
    invalida();
  };

  const direzione = (azimut: number, elevazione: number) => {
    const az = THREE.MathUtils.degToRad(azimut);
    const el = THREE.MathUtils.degToRad(elevazione);
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  };

  const distanzaPer = (w: number, h: number) => {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(w / 2 / (t * camera.aspect), h / 2 / t) * 1.16;
  };

  const ingombro = () => {
    const box = esploso ? replica.misuraEsplosa : replica.misuraRiposo;
    return { centro: box.getCenter(new THREE.Vector3()), misura: box.getSize(new THREE.Vector3()) };
  };

  // Camera di prova per `inquadra`: stessi parametri di quella vera, ma non tocca la scena.
  const cameraProva = new THREE.PerspectiveCamera(camera.fov, 1, 1, 700);
  const RIEMPI = 0.84; // quanta parte del riquadro (larghezza o altezza, la più stretta) occupa il modello

  /**
   * Distanza e punto di mira per guardare `box` da `dir` (versore) con il modello centrato nel riquadro e che lo
   * riempie per `RIEMPI`. Proietta gli otto angoli dell'ingombro: tiene conto della prospettiva (la parte più vicina
   * appare più grande) e delle proporzioni del riquadro, che cambiano da telefono a desktop.
   */
  const inquadra = (dir: InstanceType<ModuloThree['Vector3']>, box: InstanceType<ModuloThree['Box3']>) => {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const angoli = Array.from(
      { length: 8 },
      (_, i) => new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z),
    );
    const bersaglio = box.getCenter(new THREE.Vector3());
    const dimensioni = box.getSize(new THREE.Vector3());
    let distanza = distanzaPer(Math.max(dimensioni.x, dimensioni.z), dimensioni.y);
    cameraProva.aspect = camera.aspect;
    cameraProva.updateProjectionMatrix();
    const destra = new THREE.Vector3();
    const su = new THREE.Vector3();
    const p = new THREE.Vector3();
    // Qualche passo basta: ogni giro centra le proiezioni e ricalcola la distanza.
    for (let giro = 0; giro < 6; giro++) {
      cameraProva.position.copy(bersaglio).addScaledVector(dir, distanza);
      cameraProva.lookAt(bersaglio);
      cameraProva.updateMatrixWorld(true);
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const angolo of angoli) {
        p.copy(angolo).project(cameraProva);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      cameraProva.matrixWorld.extractBasis(destra, su, p);
      bersaglio
        .addScaledVector(destra, ((minX + maxX) / 2) * distanza * t * cameraProva.aspect)
        .addScaledVector(su, ((minY + maxY) / 2) * distanza * t);
      distanza *= Math.max((maxX - minX) / 2, (maxY - minY) / 2) / RIEMPI;
    }
    return { distanza, bersaglio };
  };

  const vai = (nome: NomeVista, anima: boolean) => {
    ultimaVista = nome;
    const dir =
      nome === 'dx'
        ? direzione(0, 0)
        : nome === 'sx'
          ? direzione(180, 0)
          : nome === 'alto'
            ? new THREE.Vector3(0, 1, 0.03).normalize()
            : direzione(28, 20);
    const { distanza, bersaglio } = inquadra(dir, esploso ? replica.misuraEsplosa : replica.misuraRiposo);
    portaA(dir, distanza, bersaglio, anima);
  };

  const focalizza = (id: string, anima: boolean) => {
    const parte = replica.parti.get(id);
    if (!parte) return;
    const centro = parte.misura.getCenter(new THREE.Vector3()).addScaledVector(parte.esplosione, esploso ? 1 : 0);
    const misura = parte.misura.getSize(new THREE.Vector3());
    const dir = parte.lato === 'dx' ? direzione(12, 8) : parte.lato === 'sx' ? direzione(168, 8) : direzione(24, 18);
    const ing = ingombro();
    const piena = distanzaPer(ing.misura.x, ing.misura.y);
    const d = distanzaPer(Math.hypot(misura.x, misura.z) * 1.1, misura.y * 1.2);
    portaA(dir, limita(d, distanzaPer(46, 28), piena * 0.9), centro, anima);
  };

  // ── Etichetta che segue la parte selezionata ──
  const proiezione = new THREE.Vector3();
  const aggiornaEtichetta = () => {
    if (!selezionata || larghezza === 0) {
      el.etichetta.style.visibility = 'hidden';
      return;
    }
    replica.centroParte(selezionata, proiezione).project(camera);
    if (proiezione.z > 1) {
      el.etichetta.style.visibility = 'hidden';
      return;
    }
    const x = (proiezione.x * 0.5 + 0.5) * larghezza;
    const y = (-proiezione.y * 0.5 + 0.5) * altezza;
    const bw = el.bolla.offsetWidth;
    const bh = el.bolla.offsetHeight;
    const ax = limita(x - bw / 2, 6, Math.max(6, larghezza - bw - 6));
    let ay = y - bh - 16;
    if (ay < 6) ay = y + 16;
    ay = limita(ay, 6, Math.max(6, altezza - bh - 6));
    el.etichetta.style.transform = `translate(${x}px, ${y}px)`;
    el.bolla.style.transform = `translate(${ax - x}px, ${ay - y}px)`;
    el.etichetta.style.visibility = 'visible';
  };

  const disegna = (adesso: number) => {
    let continua = false;
    if (tween) {
      const p = limita((adesso - tween.inizio) / tween.durata, 0, 1);
      const k = ease(p);
      const { da, a } = tween;
      applica(
        da.raggio + (a.raggio - da.raggio) * k,
        da.theta + (a.theta - da.theta) * k,
        da.phi + (a.phi - da.phi) * k,
        new THREE.Vector3().lerpVectors(da.bersaglio, a.bersaglio, k),
      );
      if (p >= 1) tween = null;
      else continua = true;
    }
    if (tweenEsplosione) {
      const p = limita((adesso - tweenEsplosione.inizio) / tweenEsplosione.durata, 0, 1);
      esplosione = tweenEsplosione.da + (tweenEsplosione.a - tweenEsplosione.da) * ease(p);
      replica.esplodi(esplosione);
      if (p >= 1) tweenEsplosione = null;
      else continua = true;
    }
    if (controlli.update()) continua = true;
    renderer.render(scena, camera);
    aggiornaEtichetta();
    if (continua) invalida();
  };

  const ciclo = (adesso: number) => {
    rAF = 0;
    if (distrutto || !sporco || !inVista || !schedaVisibile) return;
    sporco = false;
    disegna(adesso);
  };

  controlli.addEventListener('change', invalida);
  controlli.addEventListener('start', () => {
    tween = null;
    interagito = true;
  });

  // ── Dimensioni ──
  const ridimensiona = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    const prima = larghezza === 0;
    larghezza = w;
    altezza = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Finché l'utente non ha mosso la camera, la vista si adatta alle nuove proporzioni.
    if (prima || !interagito) {
      if (selezionata && !prima) focalizza(selezionata, false);
      else vai(ultimaVista, false);
    }
    invalida();
  };
  const osservaDimensioni = new ResizeObserver(ridimensiona);
  osservaDimensioni.observe(host);

  // ── Visibilità: niente ridisegno se il visore è fuori schermo o la scheda è nascosta ──
  const osservaVista = new IntersectionObserver(
    ([voce]) => {
      inVista = voce?.isIntersecting ?? true;
      if (inVista) invalida();
    },
    { threshold: 0.01 },
  );
  osservaVista.observe(host);
  const alCambioScheda = () => {
    schedaVisibile = document.visibilityState === 'visible';
    if (schedaVisibile) invalida();
  };
  document.addEventListener('visibilitychange', alCambioScheda);

  // ── Tema (chiaro o scuro, classe `dark` su <html>): i colori si rileggono dalle variabili CSS ──
  const osservaTema = new MutationObserver(() => {
    replica.impostaColori(leggiTavolozza(THREE));
    invalida();
  });
  osservaTema.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // ── Zoom con la rotella solo dopo un clic sul visore ──
  let zoomAttivo = false;
  const impostaZoom = (attivo: boolean) => {
    if (zoomAttivo === attivo) return;
    zoomAttivo = attivo;
    cb.onZoomAttivo(attivo);
  };
  const filtraRotella = (e: WheelEvent) => {
    if (!zoomAttivo) e.stopPropagation(); // la rotella continua a far scorrere la pagina
  };
  host.addEventListener('wheel', filtraRotella, { capture: true, passive: true });

  // ── Selezione col puntatore: il tocco si distingue dal trascinamento ──
  const raggio = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const trovaParte = (e: PointerEvent): string | null => {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    scena.updateMatrixWorld(true);
    raggio.setFromCamera(ndc, camera);
    const colpi = raggio.intersectObjects(replica.cliccabili, false);
    const id = colpi[0]?.object.userData.id;
    return typeof id === 'string' ? id : null;
  };

  const attivi = new Set<number>();
  let inizio: { id: number; x: number; y: number; t: number; multi: boolean } | null = null;
  const alPuntatoreGiu = (e: PointerEvent) => {
    attivi.add(e.pointerId);
    if (attivi.size === 1) inizio = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), multi: false };
    else if (inizio) inizio.multi = true;
    canvas.style.cursor = 'grabbing';
  };
  const alPuntatoreSu = (e: PointerEvent) => {
    attivi.delete(e.pointerId);
    canvas.style.cursor = 'grab';
    const i = inizio;
    if (attivi.size === 0) inizio = null;
    if (e.pointerType === 'mouse') impostaZoom(true);
    if (!i || i.id !== e.pointerId || i.multi) return;
    const spostamento = Math.hypot(e.clientX - i.x, e.clientY - i.y);
    if (spostamento > 6 || performance.now() - i.t > 900) return;
    const id = trovaParte(e);
    if (id) cb.onSelezione(id);
  };
  const alPuntatoreAnnullato = (e: PointerEvent) => {
    attivi.delete(e.pointerId);
    inizio = null;
    canvas.style.cursor = 'grab';
  };
  let rAFCursore = 0;
  const alPuntatoreMuove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.buttons !== 0 || rAFCursore) return;
    rAFCursore = requestAnimationFrame(() => {
      rAFCursore = 0;
      if (!distrutto) canvas.style.cursor = trovaParte(e) ? 'pointer' : 'grab';
    });
  };
  const alPuntatoreEsce = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') impostaZoom(false);
  };
  canvas.addEventListener('pointerdown', alPuntatoreGiu);
  canvas.addEventListener('pointerup', alPuntatoreSu);
  canvas.addEventListener('pointercancel', alPuntatoreAnnullato);
  canvas.addEventListener('pointermove', alPuntatoreMuove);
  canvas.addEventListener('pointerleave', alPuntatoreEsce);

  // Se il browser toglie il contesto WebGL (succede sui telefoni, con la scheda in secondo piano o poca memoria),
  // non si distrugge nulla: preventDefault ne permette il ripristino, three.js ricrea da solo lo stato GPU
  // (il suo gestore è registrato prima del nostro) e qui basta ridisegnare. Se il ripristino non arriva,
  // decide il componente.
  const alContestoPerso = (e: Event) => {
    e.preventDefault();
    cb.onContestoPerso();
  };
  const alContestoRipristinato = () => {
    cb.onContestoRipristinato();
    invalida();
  };
  canvas.addEventListener('webglcontextlost', alContestoPerso);
  canvas.addEventListener('webglcontextrestored', alContestoRipristinato);

  return {
    seleziona(id, conCamera) {
      if (id === selezionata && !conCamera) return;
      selezionata = id;
      replica.evidenzia(id);
      if (id && conCamera) {
        interagito = true;
        focalizza(id, true);
      }
      invalida();
    },
    vista(nome) {
      interagito = true;
      vai(nome, true);
    },
    esplodi(acceso) {
      if (acceso === esploso) return;
      esploso = acceso;
      const verso = acceso ? 1 : 0;
      if (ridotto.matches) {
        tweenEsplosione = null;
        esplosione = verso;
        replica.esplodi(verso);
      } else {
        tweenEsplosione = { inizio: performance.now(), durata: 750, da: esplosione, a: verso };
      }
      // Con le parti più distanti serve più spazio: la camera si riadatta mantenendo l'angolo.
      if (selezionata) focalizza(selezionata, true);
      else {
        const dir = camera.position.clone().sub(controlli.target).normalize();
        const { distanza, bersaglio } = inquadra(dir, esploso ? replica.misuraEsplosa : replica.misuraRiposo);
        portaA(dir, distanza, bersaglio, true);
      }
      invalida();
    },
    zoom(fattore) {
      interagito = true;
      const dir = camera.position.clone().sub(controlli.target);
      const dist = limita(dir.length() * fattore, controlli.minDistance, controlli.maxDistance);
      portaA(dir.normalize(), dist, controlli.target.clone(), true);
    },
    reimposta() {
      interagito = false;
      selezionata = null;
      replica.evidenzia(null);
      this.esplodi(false);
      vai('reset', true);
    },
    dispose() {
      distrutto = true;
      cancelAnimationFrame(rAF);
      cancelAnimationFrame(rAFCursore);
      osservaDimensioni.disconnect();
      osservaVista.disconnect();
      osservaTema.disconnect();
      document.removeEventListener('visibilitychange', alCambioScheda);
      host.removeEventListener('wheel', filtraRotella, { capture: true });
      canvas.removeEventListener('pointerdown', alPuntatoreGiu);
      canvas.removeEventListener('pointerup', alPuntatoreSu);
      canvas.removeEventListener('pointercancel', alPuntatoreAnnullato);
      canvas.removeEventListener('pointermove', alPuntatoreMuove);
      canvas.removeEventListener('pointerleave', alPuntatoreEsce);
      canvas.removeEventListener('webglcontextlost', alContestoPerso);
      canvas.removeEventListener('webglcontextrestored', alContestoRipristinato);
      ridotto.removeEventListener('change', alCambioMovimento);
      controlli.dispose();
      replica.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}


// ── Componente ───────────────────────────────────────────────────────────

/** Se il contesto WebGL perso non torna entro questo tempo, il visore lascia il posto al messaggio. */
const ATTESA_RIPRISTINO_MS = 5000;

const MESSAGGI = {
  caricamento: 'Caricamento del modello 3D…',
  perso: 'Il modello 3D si è interrotto: provo a ripristinarlo…',
  errore: "Il modello 3D non è disponibile su questo dispositivo: qui sotto trovi comunque l'elenco delle parti.",
} as const;

function Avvertenza({ testo, className }: { testo: string; className?: string }) {
  return (
    <div className={cn('mt-3 border-l-[3px] border-warning bg-warning/10 p-3', className)}>
      <p className="kicker flex items-center gap-1.5 text-signal">
        <WarningIcon weight="bold" className="size-3.5" aria-hidden="true" />
        Occhio
      </p>
      <p className="mt-1 text-sm leading-relaxed">{testo}</p>
    </div>
  );
}

export default function Replica3D({ parti }: { parti: ParteReplica[] }) {
  const id = useId();
  const idScheda = `${id}-scheda`;
  // Falso nell'HTML del server e nel primo rendering del browser: finché non c'è JavaScript i testi di tutte
  // le parti restano leggibili dentro l'elenco; dopo l'idratazione li mostra la scheda sotto il visore.
  const [idratato, setIdratato] = useState(false);
  const [selezione, setSelezione] = useState<string | null>(null);
  const [esploso, setEsploso] = useState(false);
  const [stato, setStato] = useState<StatoModello>('caricamento');
  const [contestoPerso, setContestoPerso] = useState(false);
  const [zoomAttivo, setZoomAttivo] = useState(false);
  const [dalModello, setDalModello] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const etichettaRef = useRef<HTMLDivElement>(null);
  const bollaRef = useRef<HTMLDivElement>(null);
  const visoreRef = useRef<HTMLDivElement>(null);
  const motoreRef = useRef<Motore | null>(null);

  const indice = useMemo(() => new Map(parti.map((p, i) => [p.id, i])), [parti]);
  const corrente = selezione ? parti.find((p) => p.id === selezione) : undefined;

  useEffect(() => {
    setIdratato(true);
  }, []);

  // Costruzione del visore: solo nel browser, e solo se WebGL funziona.
  useEffect(() => {
    let annullato = false;
    let motore: Motore | null = null;
    let attesa: ReturnType<typeof setTimeout> | undefined;
    const host = hostRef.current;
    const etichetta = etichettaRef.current;
    const bolla = bollaRef.current;
    if (!host || !etichetta || !bolla) return;

    const fallisci = () => {
      clearTimeout(attesa);
      motore?.dispose();
      motore = null;
      motoreRef.current = null;
      if (!annullato) {
        setContestoPerso(false);
        setStato('errore');
      }
    };

    (async () => {
      try {
        const [THREE, controlli, modello] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('@/lib/replica-modello'),
        ]);
        if (annullato) return;
        motore = creaMotore(THREE, controlli, modello, { host, etichetta, bolla }, {
          onSelezione: (scelta) => {
            setDalModello(true);
            setSelezione((attuale) => (attuale === scelta ? attuale : scelta));
          },
          onZoomAttivo: setZoomAttivo,
          // Contesto perso: velo e messaggio; si distrugge tutto solo se il ripristino non arriva.
          onContestoPerso: () => {
            setContestoPerso(true);
            clearTimeout(attesa);
            attesa = setTimeout(fallisci, ATTESA_RIPRISTINO_MS);
          },
          onContestoRipristinato: () => {
            clearTimeout(attesa);
            setContestoPerso(false);
          },
        });
        motoreRef.current = motore;
        setStato('pronto');
      } catch {
        fallisci();
      }
    })();

    return () => {
      annullato = true;
      clearTimeout(attesa);
      motore?.dispose();
      motoreRef.current = null;
    };
  }, []);

  // Il motore segue lo stato di React: evidenziazione e vista esplosa.
  useEffect(() => {
    if (stato === 'pronto') motoreRef.current?.seleziona(selezione, !dalModello);
  }, [stato, selezione, dalModello]);

  useEffect(() => {
    if (stato === 'pronto') motoreRef.current?.esplodi(esploso);
  }, [stato, esploso]);

  /** Dopo una scelta dall'elenco, che sta sotto il visore: se il modello è fuori schermo, lo si riporta in vista. */
  const portaVisoreInVista = () => {
    const host = hostRef.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const sotto = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    if (r.top >= sotto && r.bottom <= window.innerHeight) return;
    const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;
    visoreRef.current?.scrollIntoView({ block: 'start', behavior: riduci ? 'auto' : 'smooth' });
  };

  const scegli = (parteId: string) => {
    const apre = parteId !== selezione;
    setDalModello(false);
    setSelezione(apre ? parteId : null);
    if (apre && stato === 'pronto') portaVisoreInVista();
  };

  const reimposta = () => {
    setSelezione(null);
    setEsploso(false);
    motoreRef.current?.reimposta();
  };

  const pronto = stato === 'pronto';
  const messaggio =
    stato === 'errore' ? MESSAGGI.errore : contestoPerso ? MESSAGGI.perso : idratato && stato === 'caricamento' ? MESSAGGI.caricamento : null;
  const comandi = 'h-11 px-3 text-sm lg:h-10';

  return (
    <div className="not-doc grid gap-8">
      {/* Visore, comandi e scheda della parte: a tutta larghezza, in alto. */}
      <div ref={visoreRef} className="replica-visore">
        <div className="hud border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <p className="kicker">Modello 3D // tipo M4</p>
            <p className="kicker hidden text-right whitespace-nowrap xl:block" aria-hidden="true">
              {pronto ? (zoomAttivo ? 'Rotella: zoom attivo' : 'Rotella: prima un clic') : ''}
            </p>
          </div>

          <div className="relative">
            <div
              ref={hostRef}
              role="img"
              aria-label="Modello 3D schematico di una replica tipo M4. Le stesse parti sono descritte nell'elenco."
              className={cn(
                'map-grid relative w-full touch-pan-y overflow-hidden',
                stato === 'errore'
                  ? 'h-36'
                  : 'aspect-[4/3] max-h-[55svh] sm:aspect-[16/9] sm:max-h-[65svh]',
              )}
            >
              {/* Etichetta: la posizione la imposta il motore a ogni ridisegno. */}
              <div
                ref={etichettaRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 z-10 invisible"
              >
                <span className="absolute -top-1 -left-1 size-2 rounded-full bg-foreground ring-2 ring-background" />
                <div
                  ref={bollaRef}
                  className="absolute top-0 left-0 max-w-[16rem] border border-primary bg-background/95 px-2 py-1 text-xs font-semibold leading-tight whitespace-nowrap shadow-sm"
                >
                  {corrente && (
                    <>
                      <span className="mr-1.5 font-mono text-primary">{numero(indice.get(corrente.id) ?? 0)}</span>
                      {ETICHETTA_BREVE(corrente.nome)}
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Messaggi di stato fuori dal role="img" (i suoi figli non si leggono). L'elemento resta sempre montato:
                cambia solo il contenuto, così i lettori di schermo lo annunciano. */}
            <div
              role="status"
              className={cn(
                'pointer-events-none absolute inset-0 z-20 grid place-items-center p-6 text-center',
                contestoPerso && pronto && 'bg-background/80',
              )}
            >
              {messaggio && <p className="max-w-xs text-sm text-muted-foreground">{messaggio}</p>}
            </div>
          </div>

          {pronto && (
            <div className="flex flex-wrap items-center gap-2 border-t p-3">
              <Button variant="outline" className={comandi} onClick={() => motoreRef.current?.vista('dx')}>
                Lato destro
              </Button>
              <Button variant="outline" className={comandi} onClick={() => motoreRef.current?.vista('sx')}>
                Lato sinistro
              </Button>
              <Button variant="outline" className={comandi} onClick={() => motoreRef.current?.vista('alto')}>
                Dall'alto
              </Button>
              <Button variant="outline" className={comandi} onClick={reimposta}>
                <ArrowCounterClockwiseIcon />
                Reimposta
              </Button>
              <Button
                variant={esploso ? 'default' : 'outline'}
                className={comandi}
                aria-pressed={esploso}
                onClick={() => setEsploso((v) => !v)}
              >
                <ArrowsOutCardinalIcon />
                Vista esplosa
              </Button>
              <span className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  className="size-11 lg:size-10"
                  aria-label="Avvicina"
                  onClick={() => motoreRef.current?.zoom(0.75)}
                >
                  <PlusIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-11 lg:size-10"
                  aria-label="Allontana"
                  onClick={() => motoreRef.current?.zoom(1.33)}
                >
                  <MinusIcon />
                </Button>
              </span>
            </div>
          )}

          {/* Scheda della parte scelta (dal modello o dall'elenco): sta sotto i comandi, così non li sposta mai.
              L'elemento con aria-live resta sempre montato; cambia solo il contenuto. */}
          <div id={idScheda} aria-live="polite" aria-atomic="true">
            {idratato && (
              <div className="min-h-44 border-t p-3 sm:min-h-32 sm:p-4">
                {corrente ? (
                  <div className="grid gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-start">
                    <div>
                      <p className="heading text-base sm:text-lg">
                        <span className="mr-2 font-mono text-sm text-primary">{numero(indice.get(corrente.id) ?? 0)}</span>
                        {corrente.nome}
                      </p>
                      <p className="mt-1 max-w-prose text-sm leading-relaxed">{corrente.testo}</p>
                    </div>
                    {corrente.occhio && <Avvertenza testo={corrente.occhio} className="mt-0" />}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {pronto
                      ? "Tocca una parte del modello o scegli dall'elenco qui sotto per leggerne la scheda."
                      : "Scegli una parte dall'elenco qui sotto per leggerne la scheda."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        {pronto && (
          <p className="mt-2 text-xs text-muted-foreground">
            Trascina per ruotare, pizzica per ingrandire (con la rotella: prima un clic sul modello), tocca una parte per leggerne la scheda.
            <span className="hidden pointer-coarse:inline">
              {' '}
              Sul touch screen un dito ruota il modello in orizzontale; per le altre viste ci sono i pulsanti.
            </span>
          </p>
        )}
      </div>

      {/* Elenco delle parti (HTML vero, anche senza JavaScript): i gruppi si dispongono su più colonne. */}
      <div className="min-w-0">
        <p className="kicker mb-3">Le parti // {parti.length}</p>
        <div className="sm:columns-2 sm:gap-x-6 lg:columns-3">
          {GRUPPI.map((gruppo) => {
            const delGruppo = parti.filter((p) => p.gruppo === gruppo.id);
            if (delGruppo.length === 0) return null;
            return (
              <section key={gruppo.id} aria-labelledby={`${id}-${gruppo.id}`} className="mb-5 break-inside-avoid">
                <h3 id={`${id}-${gruppo.id}`} className="heading border-b pb-1.5 text-lg">
                  {gruppo.titolo}
                </h3>
                <ul className="border-x border-b bg-card">
                  {delGruppo.map((parte) => {
                    const scelta = parte.id === selezione;
                    return (
                      <li key={parte.id} className="border-t first:border-t-0">
                        <button
                          type="button"
                          aria-expanded={idratato ? scelta : undefined}
                          aria-controls={idratato ? idScheda : undefined}
                          onClick={() => scegli(parte.id)}
                          className={cn(
                            'flex min-h-11 w-full cursor-pointer items-start gap-3 border-l-[3px] border-transparent px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset',
                            scelta && 'border-primary bg-muted',
                          )}
                        >
                          <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-primary">{numero(indice.get(parte.id) ?? 0)}</span>
                          <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug font-medium">{parte.nome}</span>
                        </button>
                        {/* Senza JavaScript il testo si legge qui; dopo l'idratazione lo mostra la scheda sotto il visore. */}
                        <div hidden={idratato} className="px-3 pb-4 pl-[3.25rem]">
                          <p className="text-sm leading-relaxed">{parte.testo}</p>
                          {parte.occhio && <Avvertenza testo={parte.occhio} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
