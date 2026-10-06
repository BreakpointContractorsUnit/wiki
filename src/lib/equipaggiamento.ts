// Struttura e controlli di data/equipaggiamento.json.

export const PRIORITA = [
  { id: 'subito', ancora: 'obbligatorio-subito', titolo: 'Obbligatorio subito', breve: 'Subito' },
  { id: 'col-tempo', ancora: 'obbligatorio-col-tempo', titolo: 'Obbligatorio col tempo', breve: 'Col tempo' },
  { id: 'consigliato', ancora: 'consigliato', titolo: 'Consigliato', breve: 'Consigliato' },
] as const;

export type PrioritaId = (typeof PRIORITA)[number]['id'];

export interface Voce {
  id: string;
  nome: string;
  categoria: string;
  perche: string;
  prezzo: string;
  /** Estremi della fascia di prezzo in euro, usati per il calcolo del budget. */
  prezzo_min?: number;
  prezzo_max?: number;
  priorita: PrioritaId;
  link?: { negozio: string; url: string }[];
  note?: string;
  /** true: voce proposta, non ancora confermata dalla squadra. */
  bozza?: boolean;
}

/** Controlla il file in fase di build: un errore qui blocca la pubblicazione invece di nascondere una voce. */
export function validaEquipaggiamento(dati: unknown): Voce[] {
  if (!Array.isArray(dati)) throw new Error('data/equipaggiamento.json: il file deve contenere un array');
  const visti = new Set<string>();
  for (const voce of dati as Partial<Voce>[]) {
    const dove = `data/equipaggiamento.json, voce "${voce.id ?? voce.nome ?? '?'}"`;
    if (!voce.id || !/^[a-z0-9-]+$/.test(voce.id)) throw new Error(`${dove}: "id" mancante o non in kebab-case`);
    if (visti.has(voce.id)) throw new Error(`${dove}: "id" duplicato`);
    visti.add(voce.id);
    for (const campo of ['nome', 'categoria', 'perche', 'prezzo'] as const) {
      if (!voce[campo]) throw new Error(`${dove}: campo "${campo}" mancante`);
    }
    if (!PRIORITA.some((p) => p.id === voce.priorita)) {
      throw new Error(`${dove}: "priorita" deve essere subito, col-tempo o consigliato (trovato "${voce.priorita}")`);
    }
    for (const campo of ['prezzo_min', 'prezzo_max'] as const) {
      const valore: unknown = voce[campo];
      if (valore !== undefined && (typeof valore !== 'number' || !Number.isFinite(valore) || valore < 0)) {
        throw new Error(`${dove}: "${campo}" deve essere un numero (senza virgolette), oppure va tolto`);
      }
    }
    if (voce.bozza !== undefined && typeof voce.bozza !== 'boolean') {
      throw new Error(`${dove}: "bozza" deve essere true o false (senza virgolette)`);
    }
    if ((voce.prezzo_min === undefined) !== (voce.prezzo_max === undefined)) {
      throw new Error(`${dove}: "prezzo_min" e "prezzo_max" vanno indicati insieme`);
    }
    if (voce.prezzo_min !== undefined && !(voce.prezzo_min <= voce.prezzo_max!)) {
      throw new Error(`${dove}: "prezzo_min" deve essere minore o uguale a "prezzo_max"`);
    }
    if (voce.link !== undefined && !Array.isArray(voce.link)) throw new Error(`${dove}: "link" deve essere un array`);
    for (const link of voce.link ?? []) {
      if (!link?.negozio || !/^https?:\/\//i.test(link.url ?? '')) {
        throw new Error(`${dove}: ogni link richiede "negozio" e un "url" che inizi con http:// o https://`);
      }
    }
  }
  return dati as Voce[];
}

export interface Fascia {
  min: number;
  max: number;
  /** Voci senza prezzo numerico, escluse dal totale. */
  senzaPrezzo: number;
}

export function sommaFasce(voci: Voce[]): Fascia {
  const fascia: Fascia = { min: 0, max: 0, senzaPrezzo: 0 };
  for (const voce of voci) {
    if (typeof voce.prezzo_min !== 'number' || typeof voce.prezzo_max !== 'number') fascia.senzaPrezzo += 1;
    else {
      fascia.min += voce.prezzo_min;
      fascia.max += voce.prezzo_max;
    }
  }
  return fascia;
}

// useGrouping 'always': in italiano il separatore delle migliaia di norma parte da 10.000, qui lo vogliamo già a 1.000.
const euro = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });

export function formattaFascia({ min, max }: Fascia): string {
  return min === max ? `${euro.format(min)} €` : `${euro.format(min)}–${euro.format(max)} €`;
}

/** Come formattaFascia, ma dice anche quando una parte delle voci non ha un prezzo e resta fuori dal conto. */
export function descriviFascia(fascia: Fascia): string {
  if (fascia.min === 0 && fascia.max === 0 && fascia.senzaPrezzo > 0) return 'prezzo variabile';
  return formattaFascia(fascia) + (fascia.senzaPrezzo > 0 ? ` + ${fascia.senzaPrezzo} a prezzo variabile` : '');
}
