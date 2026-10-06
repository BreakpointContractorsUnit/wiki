import {
  BackpackIcon,
  BookOpenTextIcon,
  BroadcastIcon,
  CrosshairIcon,
  HouseIcon,
  ListChecksIcon,
  ScrollIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  type Icon,
} from '@phosphor-icons/react';

export const SITE = {
  nome: 'BCU Wiki',
  squadra: 'Breakpoint Contractors Unit',
  motto: 'Audentes fortuna iuvat',
  repo: 'https://github.com/BreakpointContractorsUnit/wiki',
  ramo: 'master',
  // Sito ufficiale dell'associazione: i recapiti stanno lì, qui si rimanda soltanto.
  sitoUfficiale: 'https://www.breakpointcontractorsunit.it/',
  paginaContatti: 'https://www.breakpointcontractorsunit.it/contatti',
  email: 'segreteria@breakpointcontractorsunit.it',
  social: [
    { nome: 'Instagram', url: 'https://www.instagram.com/breakpointcontractorsunit/' },
    { nome: 'Facebook', url: 'https://www.facebook.com/airsoft.bcu' },
    { nome: 'YouTube', url: 'https://www.youtube.com/@BreakpointContractorsUnit' },
    { nome: 'TikTok', url: 'https://www.tiktok.com/@airsoft.bcu' },
  ],
};

export interface Pagina {
  /** Nome del file in src/pages (senza estensione): diventa <slug>.html. */
  slug: string;
  /** Voce di menu. */
  label: string;
  /** Titolo della pagina (h1), se diverso dalla voce di menu. */
  titolo?: string;
  /** Numero del documento mostrato in testata. */
  codice: string;
  /** Una riga di descrizione, usata nelle schede della home e nel menu mobile. */
  descr: string;
  icon: Icon;
}

// L'ordine di questo elenco è l'ordine del menu e dei link "precedente / successiva".
export const PAGINE: Pagina[] = [
  {
    slug: 'index',
    label: 'Home',
    titolo: 'Breakpoint Contractors Unit',
    codice: '00',
    descr: 'Chi siamo e da dove iniziare.',
    icon: HouseIcon,
  },
  {
    slug: 'onboarding',
    label: 'Onboarding',
    codice: '01',
    descr: "L'equipaggiamento per iniziare, in ordine di priorità, con il budget.",
    icon: BackpackIcon,
  },
  {
    slug: 'team-rules',
    label: 'Regolamento',
    codice: '02',
    descr: "Le regole da seguire in campo e l'organizzazione della squadra.",
    icon: ScrollIcon,
  },
  {
    slug: 'game-rules',
    label: 'Sicurezza',
    titolo: 'Sicurezza e normativa',
    codice: '03',
    descr: 'Zona sicura, protezioni, primo soccorso e cosa dice la legge.',
    icon: ShieldCheckIcon,
  },
  {
    slug: 'radio',
    label: 'Radio',
    codice: '04',
    descr: 'Canali, procedure radio e alfabeto fonetico.',
    icon: BroadcastIcon,
  },
  {
    slug: 'giornata',
    label: 'In campo',
    titolo: 'Giornata di gioco',
    codice: '05',
    descr: 'Come si svolge una giornata e la checklist per non dimenticare nulla.',
    icon: ListChecksIcon,
  },
  {
    slug: 'replica',
    label: 'Replica',
    titolo: 'Anatomia della replica',
    codice: '06',
    descr: 'Il modello 3D di un fucile da softair: come si chiamano le parti e a che cosa servono.',
    icon: CrosshairIcon,
  },
  {
    slug: 'glossario',
    label: 'Glossario',
    codice: '07',
    descr: 'Le parole del softair spiegate in una riga.',
    icon: BookOpenTextIcon,
  },
  {
    slug: 'join',
    label: 'Unisciti',
    titolo: 'Unisciti a noi',
    codice: '08',
    descr: 'Come entrare in squadra, contatti e domande frequenti.',
    icon: UserPlusIcon,
  },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Indirizzo di una pagina del sito, comprensivo del percorso base (/wiki). */
export function href(slug: string, ancora = ''): string {
  const file = slug === 'index' ? '' : `${slug}.html`;
  return `${BASE}/${file}${ancora ? `#${ancora}` : ''}`;
}

/** Indirizzo di un file della cartella public/. */
export function asset(percorso: string): string {
  return `${BASE}/${percorso.replace(/^\//, '')}`;
}

/** Link "Modifica questa pagina" verso il sorgente su GitHub. */
export function linkModifica(slug: string): string {
  return `${SITE.repo}/edit/${SITE.ramo}/src/pages/${slug}.astro`;
}

// Chiavi di localStorage condivise tra lo script in <head> e i componenti.
export const STORAGE = {
  tema: 'bcu-tema',
} as const;
