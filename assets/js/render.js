'use strict';

// Carica data/<nome>.json per ogni elemento [data-render="<nome>"] e ne genera il contenuto.
// Il testo dei JSON è inserito sempre come testo semplice (mai HTML).

// Ordine e titoli delle sezioni della pagina Onboarding.
const PRIORITA = [
  ['subito', 'Obbligatorio subito'],
  ['col-tempo', 'Obbligatorio col tempo'],
  ['consigliato', 'Consigliato'],
];

const COLONNE_RADIO = [
  ['canale', 'Canale'],
  ['frequenza', 'Frequenza'],
  ['uso', 'Uso'],
  ['note', 'Note'],
];

// Posizione di scroll all'avvio: serve a non spostare chi ha già scrollato mentre i dati caricano.
const SCROLL_INIZIALE = window.scrollY;

const RENDERERS = {
  equipaggiamento: renderEquipaggiamento,
  radio: renderRadio,
  faq: renderFaq,
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function renderEquipaggiamento(target, items) {
  for (const voce of items) {
    if (!PRIORITA.some(([chiave]) => chiave === voce.priorita)) {
      console.error(`[render] equipaggiamento: priorità sconosciuta "${voce.priorita}" per "${voce.id}", voce saltata`);
    }
  }
  for (const [chiave, titolo] of PRIORITA) {
    const voci = items.filter((voce) => voce.priorita === chiave);
    if (voci.length === 0) continue;
    const lista = el('div', 'gear-list');
    for (const voce of voci) lista.append(schedaEquipaggiamento(voce, titolo));
    const gruppo = el('section', 'gear-group');
    gruppo.append(el('h2', null, titolo), lista);
    target.append(gruppo);
  }
}

function schedaEquipaggiamento(voce, etichettaPriorita) {
  const scheda = el('article', 'gear-card');
  if (voce.id) scheda.id = voce.id;

  const testata = el('div', 'gear-card-head');
  testata.append(el('h3', null, voce.nome), el('span', 'badge', etichettaPriorita));
  scheda.append(testata);

  if (voce.categoria) scheda.append(el('p', 'gear-category', voce.categoria));
  if (voce.perche) scheda.append(el('p', null, voce.perche));
  if (voce.prezzo) scheda.append(el('p', 'gear-price', `Prezzo indicativo: ${voce.prezzo}`));
  if (voce.note) scheda.append(el('p', 'gear-note', voce.note));

  if (!Array.isArray(voce.link)) {
    console.error(`[render] equipaggiamento: "link" deve essere un array per "${voce.id}", link ignorati`, voce.link);
  }
  const lista = el('ul', 'gear-links');
  for (const link of Array.isArray(voce.link) ? voce.link : []) {
    if (!link || !/^https?:\/\//i.test(link.url)) {
      console.error(`[render] equipaggiamento: link non valido per "${voce.id}", scartato`, link);
      continue;
    }
    const a = el('a', null, link.negozio || link.url);
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const li = el('li');
    li.append(a);
    lista.append(li);
  }
  if (lista.childElementCount > 0) scheda.append(lista);

  return scheda;
}

function renderRadio(target, items) {
  const intestazione = el('tr');
  for (const [, titolo] of COLONNE_RADIO) {
    const th = el('th', null, titolo);
    th.scope = 'col';
    intestazione.append(th);
  }
  const thead = el('thead');
  thead.append(intestazione);

  const tbody = el('tbody');
  for (const voce of items) {
    const riga = el('tr');
    for (const [chiave] of COLONNE_RADIO) riga.append(el('td', null, voce[chiave]));
    tbody.append(riga);
  }

  const tabella = el('table', 'radio-table');
  tabella.append(thead, tbody);
  const contenitore = el('div', 'table-wrap');
  contenitore.append(tabella);
  target.append(contenitore);
}

function renderFaq(target, items) {
  for (const voce of items) {
    const dettaglio = el('details', 'faq-item');
    dettaglio.append(el('summary', null, voce.domanda), el('p', null, voce.risposta));
    target.append(dettaglio);
  }
}

// Il browser prova a scorrere verso #ancora prima che il contenuto esista: riprova dopo il rendering,
// ma solo se chi legge non ha già scrollato nel frattempo.
function scorriAllAncora(contenitore) {
  if (!location.hash || window.scrollY !== SCROLL_INIZIALE) return;
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return; // ancora malformata (es. #%E0): la si ignora
  }
  const ancora = document.getElementById(id);
  if (ancora && contenitore.contains(ancora)) ancora.scrollIntoView();
}

async function render(contenitore) {
  const nome = contenitore.dataset.render;
  const file = `data/${nome}.json`;
  try {
    if (!Object.hasOwn(RENDERERS, nome)) throw new Error(`nessun renderer per "${nome}"`);
    const risposta = await fetch(file);
    if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
    const items = await risposta.json();
    if (!Array.isArray(items)) throw new Error('il file non contiene un array');
    // Rendering su frammento: in caso di errore non resta contenuto parziale.
    const frammento = document.createDocumentFragment();
    RENDERERS[nome](frammento, items);
    contenitore.replaceChildren(frammento);
    scorriAllAncora(contenitore);
  } catch (errore) {
    console.error(`[render] ${file}:`, errore);
    contenitore.replaceChildren(el('p', 'render-error', 'Contenuto non disponibile.'));
  }
}

document.querySelectorAll('[data-render]').forEach(render);
