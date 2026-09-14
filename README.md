# BCU Wiki

Wiki pubblica della squadra di softair **Breakpoint Contractors Unit**: guide e indicazioni per i membri e per chi vuole unirsi.

Sito statico (HTML, CSS e JavaScript, senza build né dipendenze) pubblicato con GitHub Pages:
<https://breakpointcontractorsunit.github.io/wiki/>

## Struttura

| File | Contenuto |
|---|---|
| `index.html` | Home / Chi siamo |
| `onboarding.html` | Equipaggiamento (da `data/equipaggiamento.json`) + errori da evitare |
| `game-rules.html` | Sicurezza (zona sicura, protezioni, incidenti) e normativa; per le regole di gioco rimanda a `team-rules.html` |
| `team-rules.html` | Regolamento: regole da seguire in campo + organizzazione della squadra |
| `radio.html` | Frequenze (da `data/radio.json`) + procedure radio |
| `join.html` | Come unirsi, contatti, FAQ (da `data/faq.json`) |
| `assets/css/style.css` | Stile (colori in variabili `:root`) |
| `assets/js/render.js` | Trasforma i file `data/*.json` in contenuto di pagina |
| `assets/img/logo.png` | Logo e favicon |
| `.nojekyll` | Dice a GitHub Pages di pubblicare i file così come sono |

## Anteprima in locale

I contenuti in `data/*.json` vengono caricati con `fetch`, che **non funziona** aprendo le pagine con doppio clic (`file://`): le liste mostrerebbero "Contenuto non disponibile". Serve un server statico avviato nella cartella del repo, ad esempio:

- `python -m http.server 8000` e poi <http://localhost:8000/>
- `npx serve`
- l'estensione **Live Server** di VS Code

## Modificare i contenuti

- **Testi**: direttamente nelle pagine HTML, dentro `<main>`.
- **Segnaposto**: gli elementi da completare hanno la classe `todo` (bordo giallo) e il testo inizia con `TODO:`; nei JSON i valori sono `"TODO"` o iniziano con `TODO`. Cercare `TODO` nel repo per trovarli tutti. Completato un testo, togliere anche la classe `todo`. Eccezione: gli URL segnaposto dei negozi sono `https://example.com` / `https://example.org` (un URL non può contenere `TODO`, verrebbe scartato): cercare anche `example.` e sostituirli insieme al nome del negozio.
- **Liste**: nei file `data/*.json`. Ogni file è un **array** di oggetti. I valori vengono mostrati come **testo semplice**: niente HTML (i tag comparirebbero come testo).
- Se un file JSON non è valido (virgola mancante, virgolette sbagliate…) la sezione mostra "Contenuto non disponibile" e il dettaglio dell'errore compare nella console del browser.

### `data/equipaggiamento.json`

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| `id` | sì | Identificativo univoco in kebab-case (es. `protezione-occhi`). Diventa l'ancora `onboarding.html#protezione-occhi`. |
| `nome` | sì | Nome dell'oggetto. |
| `categoria` | sì | Es. `Protezione`, `Comunicazioni`. |
| `perche` | sì | Perché serve. |
| `prezzo` | sì | Fascia indicativa, es. `€20–60`. |
| `priorita` | sì | `subito` (obbligatorio subito) · `col-tempo` (obbligatorio col tempo) · `consigliato`. Con un valore diverso la voce **non viene mostrata**. |
| `link` | sì | Da 1 a 3 oggetti `{ "negozio": "...", "url": "https://..." }`. Sono accettati solo URL `http://` o `https://`. |
| `note` | no | Avvertenze (taglia, certificazioni…). Vuoto o assente: non mostrato. |

La pagina raggruppa le voci per priorità (subito → col tempo → consigliato); dentro ogni gruppo mantiene l'ordine del file.

```json
{
  "id": "protezione-occhi",
  "nome": "Protezione per gli occhi",
  "categoria": "Protezione",
  "perche": "Obbligatoria in campo: protegge gli occhi dai pallini.",
  "prezzo": "€20–60",
  "priorita": "subito",
  "link": [{ "negozio": "Nome negozio", "url": "https://esempio.it/prodotto" }],
  "note": "Certificazione richiesta: EN166."
}
```

### `data/radio.json`

Una riga della tabella per oggetto: `canale`, `frequenza`, `uso`, `note` (tutti testo; `note` può essere vuoto).

```json
{ "canale": "1", "frequenza": "446.00625 MHz", "uso": "Comunicazioni di squadra", "note": "" }
```

### `data/faq.json`

```json
{ "domanda": "Serve esperienza per unirsi?", "risposta": "No, ..." }
```

## Aggiungere una pagina

1. Copiare una pagina di solo testo (es. `team-rules.html`) e cambiare `<title>`, `<meta name="description">` e il contenuto di `<main>`.
2. Aggiungere la voce al `<nav>` di **tutte** le pagine, nella stessa posizione ovunque.
3. Nella pagina nuova mettere `aria-current="page"` sulla sua voce (e toglierlo dalle altre voci).
4. Solo per una pagina con una lista da JSON:
   - nell'`<head>`: `<script src="assets/js/render.js" defer></script>`;
   - nel `<main>`: `<div data-render="nome"></div>` seguito da un `<noscript>` con un avviso;
   - creare `data/nome.json` e aggiungere la funzione di rendering in `RENDERERS` dentro `assets/js/render.js`.

## Grafica

Lo stile attuale è volutamente minimale e provvisorio. Tutti i colori sono variabili in `:root` di `assets/css/style.css`.
Le classi generate da `render.js` (`gear-group`, `gear-list`, `gear-card`, `gear-card-head`, `badge`, `gear-category`, `gear-price`, `gear-note`, `gear-links`, `table-wrap`, `radio-table`, `faq-item`, `render-error`) si possono restilizzare liberamente, ma **non rinominare** senza aggiornare lo script.

## Pubblicazione

Su GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `master`, cartella `/ (root)`**.
Ogni push su `master` aggiorna il sito in pochi minuti.

> Il sito è **pubblico**: tutto ciò che è nel repo (comprese frequenze radio e regolamento) è leggibile da chiunque.
