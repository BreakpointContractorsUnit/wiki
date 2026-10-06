// Controlli sui file data/*.json, eseguiti durante la compilazione del sito.
// Questi file li modificano anche persone che non programmano: se manca un campo o un valore
// ha il tipo sbagliato, la compilazione si ferma con un messaggio che dice dove guardare,
// invece di pubblicare una pagina rotta. (Per data/equipaggiamento.json vedi equipaggiamento.ts.)

function elenco(dati: unknown, file: string): Record<string, unknown>[] {
  if (!Array.isArray(dati)) throw new Error(`${file}: il file deve contenere un elenco (parentesi quadre)`);
  dati.forEach((voce, i) => {
    if (typeof voce !== 'object' || voce === null || Array.isArray(voce)) {
      throw new Error(`${file}, voce n. ${i + 1}: ogni voce deve essere un oggetto tra parentesi graffe`);
    }
  });
  return dati as Record<string, unknown>[];
}

function testo(voce: Record<string, unknown>, campo: string, dove: string, facoltativo = false): void {
  const valore = voce[campo];
  if (facoltativo && (valore === undefined || valore === '')) return;
  if (typeof valore !== 'string' || valore.trim() === '') {
    throw new Error(`${dove}: il campo "${campo}" deve essere un testo tra virgolette${facoltativo ? '' : ' e non può mancare'}`);
  }
}

function univoci(valori: string[], file: string, campo: string): void {
  const visti = new Set<string>();
  for (const valore of valori) {
    const chiave = valore.trim().toLowerCase();
    if (visti.has(chiave)) throw new Error(`${file}: "${valore}" compare due volte nel campo "${campo}"`);
    visti.add(chiave);
  }
}

export interface Canale {
  canale: string;
  frequenza: string;
  tono: string;
  uso: string;
  note: string;
}

export function validaRadio(dati: unknown): Canale[] {
  const file = 'data/radio.json';
  return elenco(dati, file).map((voce, i) => {
    const dove = `${file}, riga n. ${i + 1}`;
    testo(voce, 'canale', dove);
    testo(voce, 'frequenza', dove);
    testo(voce, 'uso', dove);
    testo(voce, 'tono', dove, true);
    testo(voce, 'note', dove, true);
    return {
      canale: voce.canale as string,
      frequenza: voce.frequenza as string,
      tono: (voce.tono as string | undefined) ?? '',
      uso: voce.uso as string,
      note: (voce.note as string | undefined) ?? '',
    };
  });
}

export interface Domanda {
  domanda: string;
  risposta: string;
  bozza: boolean;
}

export function validaFaq(dati: unknown): Domanda[] {
  const file = 'data/faq.json';
  const voci = elenco(dati, file);
  voci.forEach((voce, i) => {
    const dove = `${file}, domanda n. ${i + 1}`;
    testo(voce, 'domanda', dove);
    testo(voce, 'risposta', dove);
    if (voce.bozza !== undefined && typeof voce.bozza !== 'boolean') {
      throw new Error(`${dove}: "bozza" deve essere true o false (senza virgolette)`);
    }
  });
  univoci(voci.map((v) => v.domanda as string), file, 'domanda');
  return voci.map((v) => ({ domanda: v.domanda as string, risposta: v.risposta as string, bozza: v.bozza === true }));
}

export interface Termine {
  termine: string;
  definizione: string;
}

export function validaGlossario(dati: unknown): Termine[] {
  const file = 'data/glossario.json';
  const voci = elenco(dati, file);
  voci.forEach((voce, i) => {
    const dove = `${file}, termine n. ${i + 1}`;
    testo(voce, 'termine', dove);
    testo(voce, 'definizione', dove);
  });
  univoci(voci.map((v) => v.termine as string), file, 'termine');
  return voci.map((v) => ({ termine: v.termine as string, definizione: v.definizione as string }));
}

export interface GruppoChecklist {
  id: string;
  titolo: string;
  voci: string[];
}

export function validaChecklist(dati: unknown): GruppoChecklist[] {
  const file = 'data/checklist.json';
  const gruppi = elenco(dati, file);
  gruppi.forEach((gruppo, i) => {
    const dove = `${file}, gruppo n. ${i + 1}`;
    testo(gruppo, 'id', dove);
    testo(gruppo, 'titolo', dove);
    if (!/^[a-z0-9-]+$/.test(gruppo.id as string)) throw new Error(`${dove}: "id" deve essere in kebab-case (es. sera-prima)`);
    const voci = gruppo.voci;
    if (!Array.isArray(voci) || voci.length === 0 || voci.some((v) => typeof v !== 'string' || v.trim() === '')) {
      throw new Error(`${dove}: "voci" deve essere un elenco di testi tra virgolette, con almeno una voce`);
    }
    univoci(voci as string[], `${dove}`, 'voci');
  });
  univoci(gruppi.map((g) => g.id as string), file, 'id');
  return gruppi as unknown as GruppoChecklist[];
}

export interface ParteReplica {
  id: string;
  nome: string;
  gruppo: string;
  testo: string;
  occhio?: string;
}

/** Gruppi ammessi in data/replica.json, nell'ordine in cui compaiono nella pagina. */
export const GRUPPI_REPLICA = ['canna', 'corpo', 'comandi', 'alimentazione', 'calcio'];

export function validaReplica(dati: unknown): ParteReplica[] {
  const file = 'data/replica.json';
  const parti = elenco(dati, file);
  parti.forEach((parte, i) => {
    const dove = `${file}, parte n. ${i + 1}`;
    testo(parte, 'id', dove);
    testo(parte, 'nome', dove);
    testo(parte, 'gruppo', dove);
    testo(parte, 'testo', dove);
    testo(parte, 'occhio', dove, true);
    if (!GRUPPI_REPLICA.includes(parte.gruppo as string)) {
      throw new Error(`${dove}: "gruppo" deve essere uno tra ${GRUPPI_REPLICA.join(', ')} (trovato "${String(parte.gruppo)}")`);
    }
  });
  univoci(parti.map((p) => p.id as string), file, 'id');
  return parti as unknown as ParteReplica[];
}

