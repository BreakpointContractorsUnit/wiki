# BCU Wiki

Wiki pubblica della squadra di softair **Breakpoint Contractors Unit**: guide e indicazioni per i membri e per chi vuole unirsi.

Sito pubblicato con GitHub Pages: <https://breakpointcontractorsunit.github.io/wiki/>

> Il sito è **pubblico**: tutto ciò che è nel repository (comprese frequenze radio, regolamento e testi ancora in bozza) è leggibile da chiunque. Non inserire nulla che non vuoi far leggere a tutti.

## Indice

- [Cos'è](#cosè)
- [Anteprima in locale](#anteprima-in-locale)
- [Modificare i testi](#modificare-i-testi)
- [Bozze e dati mancanti](#bozze-e-dati-mancanti)
- [I file `data/*.json`](#i-file-datajson)
- [Aggiungere una pagina](#aggiungere-una-pagina)
- [Pagina Radio scollegata](#pagina-radio-scollegata)
- [Grafica](#grafica)
- [Animazioni](#animazioni)
- [Pubblicazione](#pubblicazione)
- [Compatibilità dei vecchi link](#compatibilità-dei-vecchi-link)

## Cos'è

Un sito fatto di pagine in HTML, con qualche tag in più, compilato con [Astro](https://astro.build). Le parti interattive (elenco dell'equipaggiamento con budget, checklist, glossario con ricerca, calcolatore di joule, compitatore fonetico) sono piccoli componenti React; lo stile usa Tailwind CSS e shadcn/ui; i font sono inclusi nel sito, senza richieste a server esterni.

**Per correggere un testo non serve saper programmare**: basta modificare il file della pagina e salvare. A ogni modifica che arriva su `master` il sito viene ricompilato e pubblicato in automatico.

| Pagina | File | Dati da |
|---|---|---|
| Home | `src/pages/index.astro` | |
| Onboarding | `src/pages/onboarding.astro` | `data/equipaggiamento.json` |
| Regolamento | `src/pages/team-rules.astro` | |
| Sicurezza e normativa | `src/pages/game-rules.astro` | |
| Radio (**scollegata**, vedi [Pagina Radio scollegata](#pagina-radio-scollegata)) | `src/pages/_radio.astro` | `data/radio.json` |
| Giornata di gioco | `src/pages/giornata.astro` | `data/checklist.json` |
| Anatomia della replica | `src/pages/replica.astro` | `data/replica.json` |
| Glossario | `src/pages/glossario.astro` | `data/glossario.json` |
| Unisciti a noi | `src/pages/join.astro` | `data/faq.json` |
| Pagina non trovata | `src/pages/404.astro` | |

Dove sta il resto:

| Percorso | Contenuto |
|---|---|
| `src/layouts/Base.astro` | Testata, menu, indice della pagina e piè di pagina, uguali per tutte le pagine |
| `src/components/*.astro` | Mattoni di contenuto: `Section`, `Callout`, `Bozza`, `Vuoti`, `Crosshair` |
| `src/components/*.tsx` | Parti interattive (React) |
| `src/components/ui/` | Componenti shadcn/ui: pulsanti, schede, caselle di spunta… |
| `src/lib/site.ts` | Elenco delle pagine (`PAGINE`), indirizzo del repository, funzioni per costruire i link |
| `src/lib/equipaggiamento.ts` | Struttura e controlli di `data/equipaggiamento.json` |
| `src/lib/dati.ts` | Controlli degli altri file `data/*.json` (radio, FAQ, glossario, checklist) |
| `src/lib/radio.ts` | Dati fissi della pagina Radio: i 16 canali PMR446 e l'alfabeto fonetico |
| `src/lib/replica-modello.ts` | Il modello 3D della pagina Replica, costruito in codice (nessun file esterno) |
| `src/lib/veneto.ts` | Il contorno del Veneto ricalcato dalla patch, per l'animazione della home |
| `src/lib/squadra.ts`, `src/components/EasterEgg.astro` | Lo scherzo nascosto: vedi [Easter egg](#easter-egg) |
| `src/styles/global.css` | Stile del contenuto delle pagine |
| `src/styles/palettes.css`, `src/styles/fonts.css` | Colori e caratteri |
| `src/assets/logo.png` | Logo usato nel sito |
| `public/` | File copiati così come sono: `favicon.png`, `apple-touch-icon.png`, `logo-512.png` (anteprima nei link condivisi) |
| `astro.config.mjs` | Configurazione: indirizzo di base `/wiki`, pagine nel formato `nome.html`, spazi dei testi trattati come in un normale file HTML |
| `.github/workflows/deploy.yml` | Pubblicazione automatica |
| `package.json`, `package-lock.json` | Dipendenze: non modificarle a mano |

## Anteprima in locale

Serve **Node.js 22.12 o successivo** (`node -v` mostra la versione installata).

```sh
npm install      # una volta sola, e quando cambia package.json
npm run dev      # avvia l'anteprima
```

Apri <http://localhost:4321/wiki/>. Il sito sta sotto `/wiki` come online; <http://localhost:4321/> porta lì in automatico. Le modifiche ai file si vedono subito nel browser; un errore compare nella pagina e nel terminale. Per fermare l'anteprima: `Ctrl+C`.

Prima di pubblicare una modifica grossa conviene provare la compilazione vera, la stessa che fa GitHub:

```sh
npm run check    # controlla il codice delle pagine e dei componenti (errori di battitura nei tag, tipi)
npm run build    # compila il sito nella cartella dist/ (si ferma con un messaggio se qualcosa non va)
npm run preview  # mostra il risultato di dist/; l'indirizzo compare nel terminale
```

La cartella `dist/` (e `.astro/`) si ricrea da sola e non va nel repository: è già nel `.gitignore`.

## Modificare i testi

**Senza installare nulla:** in fondo a ogni pagina del sito il link **«Modifica su GitHub»** apre il file della pagina nell'editor di GitHub. Modifichi, poi **Commit changes**. Serve l'accesso in scrittura al repository; senza, GitHub propone di inviare la modifica come richiesta (pull request).

Se un errore blocca la compilazione, il sito online resta com'era e il motivo si legge nella scheda **Actions** del repository.

### Com'è fatta una pagina

Ogni pagina è un file `src/pages/<nome>.astro` e diventa `<nome>.html`:

```astro
---
import Section from '@/components/Section.astro';
import Base from '@/layouts/Base.astro';

// Indice della pagina: una riga per ogni <Section>.
const toc = [{ id: 'pallini', label: 'Pallini' }];
---

<Base slug="team-rules" description="Testo per Google e anteprime." lead="Sottotitolo sotto il titolo." toc={toc}>
  <Section id="pallini" title="Pallini">
    <p>Esclusivamente <strong>BIO</strong>, a basso impatto visivo.</p>
  </Section>
</Base>
```

- La parte tra i due `---` in cima è codice: toccala solo per l'elenco `toc` (l'indice a lato) quando aggiungi o rinomini una sezione.
- Tutto dentro `<Base>…</Base>` è HTML: `<p>` paragrafo, `<strong>` grassetto, `<h3 id="...">` sottotitolo, `<a href="...">` link, `<ul>` e `<ol>` elenchi.
- Scrivi `&lt;` per il simbolo «<» (esempio: `&lt; 1,00 J`) e `&#123;` `&#125;` per le parentesi graffe: Astro altrimenti le legge come codice.
- Il titolo grande della pagina e il numero del documento non si scrivono qui: arrivano da `src/lib/site.ts`.
- `<Section id="pallini">`: l'`id` diventa l'ancora del link (`team-rules.html#pallini`) e deve comparire anche in `toc`. **Non cambiare gli `id` esistenti**: lo sanno a memoria i link già condivisi.

**Link tra pagine**, dentro i testi: relativi e con l'estensione, `<a href="onboarding.html#budget">Budget</a>`. Funzionano sia in locale sia online.

**Stile dei testi**: diretto, seconda persona, frasi brevi, niente retorica né emoji, virgolette «così». Non inventare fatti della squadra (nomi, contatti, luoghi, numeri, storia): se non li conosci usa un dato mancante, vedi sotto.

### Classi di contenuto

Dentro una pagina bastano HTML e una classe: lo stile arriva da `src/styles/global.css`.

| Cosa | Come si scrive |
|---|---|
| Elenco di regole: `si` = da fare (✓), `no` = vietato (✕), senza classe = regola neutra | `<ul class="regole"><li class="no">Vietato sparare attraverso le fessure.</li><li class="si">Tieni il calcio alla spalla.</li><li>Regola neutra.</li></ul>` |
| Procedura a passi numerati: il primo `<strong>` è il titolo del passo | `<ol class="passi"><li><strong>Prima</strong> Spiegazione.</li><li><strong>Poi</strong> Spiegazione.</li></ol>` |
| Dati chiave in evidenza (riquadri affiancati) | `<dl class="fatti"><div><dt>Pallini</dt><dd>Solo BIO</dd></div><div><dt>Potenza</dt><dd>&lt; 1,00 J</dd></div></dl>` |
| Tabella, che su telefono diventa a schede: ogni `<td>` ha `data-label` uguale all'intestazione; `class="dato"` mette il testo a spaziatura fissa (frequenze, numeri) | `<div class="table-wrap"><table class="impila"><thead><tr><th>Canale</th><th>Uso</th></tr></thead><tbody><tr><td data-label="Canale" class="dato">8</td><td data-label="Uso">Squadra</td></tr></tbody></table></div>` |
| Domanda richiudibile | `<details class="voce"><summary>Domanda?</summary><p>Risposta.</p></details>` |
| Paragrafo di introduzione, più grande e attenuato | `<p class="lead">Testo.</p>` |
| Nota a margine, piccola e attenuata | `<p class="note">Riferimenti e precisazioni.</p>` |
| Segnaposto da riempire dentro una bozza | `<mark class="vuoto">N giorni</mark>` |

### Riquadri e componenti

I componenti si usano come tag; nei file `.astro` esistenti sono già importati in cima, copia da `src/pages/game-rules.astro` o `src/pages/_radio.astro` se ne aggiungi altri.

| Componente | Uso |
|---|---|
| `<Section id="..." title="...">` | Sezione numerata con titolo e ancora |
| `<Callout tipo="info" titolo="...">` | Riquadro in evidenza. `tipo` può essere `info` (nota), `regola` (regola da ricordare), `attenzione` (avvertenza), `pericolo` (rischio per la sicurezza o conseguenze legali), `mancante` (dato che solo la squadra conosce). Senza `titolo` compare il nome del tipo. Dentro vanno uno o più `<p>` |
| `<Bozza nota="...">` | Testo proposto, non ancora approvato dalla squadra: bordo tratteggiato e timbro «Bozza» |
| `<Vuoti testo="..." />` | Mostra un testo evidenziando i segnaposto tra parentesi quadre. Lo usano le pagine che leggono i file JSON: nei file `.astro` scritti a mano serve `<mark class="vuoto">` |

Esempio di riquadro:

```astro
<Callout tipo="attenzione" titolo="Attenzione · radio «tipo Baofeng»">
  <p>Non sono apparati PMR446: superano il limite di potenza.</p>
</Callout>
```

Le parti interattive si inseriscono con una direttiva `client:`, come in `<JouleCalc client:visible />` (pagina Regolamento): senza, il componente non si anima.

## Bozze e dati mancanti

Quello che la squadra non ha ancora deciso è marcato sul sito in modo visibile, così nessuno lo scambia per una regola:

| Segno nel codice | Come appare | Che cos'è |
|---|---|---|
| `<Bozza nota="…">` … `</Bozza>` | Bordo tratteggiato e timbro «Bozza» | Testo proposto, da confermare |
| `<Callout tipo="mancante" titolo="Dato mancante · …">` | Riquadro tratteggiato con una domanda | Un dato che solo la squadra conosce |
| `<mark class="vuoto">N giorni</mark>` | Testo evidenziato in giallo | Numero o scelta da fissare, dentro una bozza |
| `"bozza": true` nei file JSON | Scheda tratteggiata o timbro «Bozza» | Voce proposta, non confermata |
| `[testo tra parentesi quadre]` nei file JSON | Testo evidenziato in giallo (pagine Radio e Unisciti a noi) | Segnaposto da riempire |

### Trovare tutto ciò che resta da completare

Con la ricerca in tutti i file dell'editor (in VS Code: `Ctrl+Maiusc+F`, `Cmd+Maiusc+F` su Mac) oppure da terminale nella cartella del repository:

```sh
grep -rn "<Bozza" src                       # testi proposti, da confermare
grep -rn 'tipo="mancante"' src              # domande a cui deve rispondere la squadra
grep -rn 'class="vuoto"' src                # numeri e scelte da fissare
grep -rn '"bozza": true' data               # voci dei file JSON in bozza
grep -nE '\[[^]"{[:space:]]' data/*.json    # segnaposto tra parentesi quadre nei JSON
```

L'ultimo comando cerca una `[` seguita da testo, così non scambia per segnaposto le `[` che aprono gli elenchi JSON.

### Confermare una bozza

- **`<Bozza>`**: prima sostituisci ogni `<mark class="vuoto">…</mark>` con il valore deciso (via anche i tag `<mark>`). Poi cancella il tag di apertura `<Bozza nota="…">` e quello di chiusura `</Bozza>`: il testo resta nella pagina, senza timbro.
- **`<Callout tipo="mancante">`**: scrivi la risposta come testo normale della pagina e cancella il riquadro.
- **File JSON**: sostituisci ogni `[segnaposto]` con il valore (via anche le parentesi quadre) e, quando la voce è confermata, cancella `"bozza": true`. Se la riga prima restava con la virgola in fondo e `"bozza": true` era l'ultima della voce, togli anche quella virgola.

Alcuni avvisi si spengono da soli: nella pagina Radio il riquadro «Dato mancante · canali della squadra» sparisce quando nessun valore di `data/radio.json` contiene più parentesi quadre.

## I file `data/*.json`

Le liste che cambiano più spesso stanno in sei file JSON. Regole comuni:

- Ogni file è un **array** `[ … ]` di oggetti `{ … }` separati da virgole, senza virgola dopo l'ultimo. I nomi dei campi e i testi vanno tra virgolette doppie `"…"`; dentro un testo usa le virgolette «così», non `"`.
- I valori sono **testo semplice**: niente HTML (i tag comparirebbero scritti).
- Un segnaposto si scrive tra parentesi quadre: `"entro [N giorni]"` (vedi sopra). Le pagine Radio e Unisciti a noi lo evidenziano in giallo; altrove le parentesi restano visibili come testo normale.
- **Un errore non passa più inosservato.** Un file JSON non valido (virgola mancante, virgolette sbagliate…), un campo obbligatorio mancante o vuoto, un valore del tipo sbagliato (un numero tra virgolette, un testo senza), un `id`, un termine o una domanda ripetuti, una `priorita` sconosciuta **bloccano la compilazione** con un messaggio in italiano che indica file e voce. Prima la voce sbagliata spariva in silenzio. I controlli stanno in `src/lib/equipaggiamento.ts` e `src/lib/dati.ts`.

### `data/equipaggiamento.json`

Pagina Onboarding: schede raggruppate per priorità, filtro per categoria, calcolo del budget.

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| `id` | sì | Identificativo unico, solo minuscole, numeri e trattini (es. `protezione-occhi`). Diventa l'ancora `onboarding.html#protezione-occhi`. Se lo cambi, chi aveva spuntato «Ce l'ho già» perde la spunta |
| `nome` | sì | Nome dell'oggetto |
| `categoria` | sì | Es. `Protezione`, `Comunicazioni`. Le categorie compaiono come pulsanti del filtro |
| `perche` | sì | Perché serve |
| `prezzo` | sì | Fascia indicativa mostrata nella scheda, es. `circa 40–95 € secondo il modello` |
| `prezzo_min`, `prezzo_max` | no, ma sempre insieme | Estremi della fascia, **numeri in euro** senza simbolo (`40`, `95`), con `prezzo_min` minore o uguale a `prezzo_max`. Servono al calcolo del budget. Senza, la voce è «a prezzo variabile» e resta fuori dal totale |
| `priorita` | sì | `subito` (obbligatorio subito) · `col-tempo` (obbligatorio col tempo) · `consigliato`. Qualsiasi altro valore blocca la compilazione |
| `link` | no | Elenco di oggetti `{ "negozio": "...", "url": "https://..." }`. L'`url` deve iniziare con `http://` o `https://`. Senza link la scheda mostra «Modello da scegliere» |
| `note` | no | Avvertenze (taglia, certificazioni…). Vuoto o assente: non mostrato |
| `bozza` | no | `true` = voce proposta, non ancora confermata: scheda tratteggiata con timbro «Bozza» |

Le voci sono raggruppate per priorità (subito, col tempo, consigliato); dentro ogni gruppo si mantiene l'ordine del file. Il budget somma le fasce di ogni gruppo; il visitatore può spuntare «Ce l'ho già» per toglierle dal conto (la scelta resta nel suo browser).

```json
{
  "id": "protezione-occhi",
  "nome": "Protezione per gli occhi",
  "categoria": "Protezione",
  "perche": "Obbligatoria in campo: protegge gli occhi dai pallini.",
  "prezzo": "circa 20–60 €",
  "prezzo_min": 20,
  "prezzo_max": 60,
  "priorita": "subito",
  "link": [{ "negozio": "Nome negozio", "url": "https://esempio.it/prodotto" }],
  "note": "Certificazione richiesta: EN166.",
  "bozza": true
}
```

### `data/radio.json`

Pagina Radio, tabella delle frequenze: una riga per oggetto, nell'ordine del file.

| Campo | Descrizione |
|---|---|
| `canale` | Numero o nome del canale |
| `frequenza` | Es. `446.00625 MHz` |
| `tono` | Tono CTCSS o DCS, se si usa |
| `uso` | A che cosa serve il canale |
| `note` | Precisazioni; può essere vuoto (`""`) |

Tutti testo. I segnaposto tra parentesi quadre sono evidenziati e, finché ce n'è uno, sotto la tabella compare il riquadro «Dato mancante».

```json
{ "canale": "1", "frequenza": "446.00625 MHz", "tono": "[da definire]", "uso": "Comunicazioni di squadra", "note": "" }
```

### `data/faq.json`

Pagina Unisciti a noi, sezione «Domande frequenti».

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| `domanda` | sì | La domanda |
| `risposta` | sì | La risposta, testo semplice; i segnaposto `[tra parentesi quadre]` sono evidenziati |
| `bozza` | no | `true` = risposta proposta, da confermare: timbro «Bozza». La pagina conta quante risposte sono ancora in bozza |

```json
{ "domanda": "Serve esperienza?", "risposta": "No. Alla prima uscita ti affianca [tutor o referente].", "bozza": true }
```

### `data/glossario.json`

Pagina Glossario. L'ordine alfabetico è automatico (senza badare ad accenti e maiuscole): aggiungi il termine dove vuoi.

| Campo | Descrizione |
|---|---|
| `termine` | La parola o la sigla |
| `definizione` | Spiegazione in una riga, testo semplice |

```json
{ "termine": "ASG", "definizione": "Air Soft Gun: la replica da softair in generale." }
```

### `data/checklist.json`

Pagina Giornata di gioco, lista di controllo da spuntare: un oggetto per gruppo di voci.

| Campo | Descrizione |
|---|---|
| `id` | Identificativo unico del gruppo, in minuscolo con trattini (es. `sera-prima`). È l'ancora `giornata.html#sera-prima` e serve a ricordare le spunte: non cambiarlo senza motivo |
| `titolo` | Titolo del gruppo |
| `voci` | Elenco di testi, uno per voce, tra virgolette e separati da virgole |

Le spunte di chi visita il sito sono ricordate per posizione (`id` + numero d'ordine): inserire o togliere una voce nel mezzo le sposta. Si rimedia con «Azzera».

```json
{ "id": "sera-prima", "titolo": "La sera prima", "voci": ["Batterie in carica", "Occhiali puliti"] }
```

### `data/replica.json`

Le parti del modello 3D della pagina Anatomia della replica.

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| `id` | sì | Identificativo della parte. **Non cambiarlo**: è lo stesso che usa il modello 3D per evidenziarla |
| `nome` | sì | Nome mostrato nell'elenco e nell'etichetta sul modello |
| `gruppo` | sì | `canna`, `corpo`, `comandi`, `alimentazione` oppure `calcio`. Le voci dello stesso gruppo vanno tenute una di seguito all'altra |
| `testo` | sì | A che cosa serve, in due o tre frasi |
| `occhio` | no | Avvertenza di sicurezza o regola di squadra, mostrata nel riquadro «Occhio» |

Per cambiare la forma del modello (non i testi) si lavora su `src/lib/replica-modello.ts`.

## Aggiungere una pagina

1. **Crea il file.** Copia una pagina di solo testo (es. `src/pages/team-rules.astro`) in `src/pages/nome.astro`, con nome in minuscolo e trattini. Diventerà `nome.html`. Cambia `slug`, `description`, `lead`, `toc` e il contenuto.
2. **Aggiungila al menu.** In `src/lib/site.ts`, nell'elenco `PAGINE`, aggiungi una voce: `slug` (uguale al nome del file), `label` (nel menu), `titolo` (facoltativo, il titolo grande se diverso), `codice` (numero del documento, es. `'08'`), `descr` (una riga, usata nelle schede e nel menu del telefono) e `icon` (un'icona di `@phosphor-icons/react`, da aggiungere all'`import` in cima al file). **L'ordine dell'elenco è l'ordine del menu** e dei link «Precedente / Successiva». Se dimentichi questo passaggio la compilazione si ferma con «Pagina "nome" non dichiarata in src/lib/site.ts».
3. **Compila l'indice.** Ogni `<Section id="x">` va ripetuta in `toc` come `{ id: 'x', label: 'Titolo' }`.
4. **Solo se serve una lista da JSON:** crea `data/nome.json`, importalo in cima alla pagina come fanno `radio.astro` (`import datiRadio from '../../data/radio.json'`) e `onboarding.astro`, e mostralo con una tabella o un componente. Per controllarne il contenuto durante la compilazione aggiungi una funzione `valida…` in `src/lib/dati.ts`, copiando una di quelle esistenti.

## Pagina Radio scollegata

La pagina Radio è **scollegata dal sito, non eliminata**: il file è `src/pages/_radio.astro`. Il trattino basso davanti al nome dice ad Astro di non pubblicarla, quindi non compare nel menu e l'indirizzo `radio.html` porta alla pagina «non trovata». Il contenuto è conservato com'era, con le sue bozze, per poterlo sistemare e ricollegare.

Per ricollegarla:

1. rinomina `src/pages/_radio.astro` in `src/pages/radio.astro`;
2. in `src/lib/site.ts` togli il commento alla voce «radio» di `PAGINE` e rimetti `BroadcastIcon` nell'`import` in cima;
3. ripristina i rimandi tolti: il link nel passo «Ferma il gioco» di `src/pages/game-rules.astro` e «Vedi la pagina Radio» nella voce PMR446 di `data/glossario.json`;
4. completa `data/radio.json` e le bozze della pagina.

Restano al loro posto, inutilizzati finché la pagina è scollegata: `data/radio.json`, `src/lib/radio.ts`, `src/components/NatoSpeller.tsx` e `validaRadio` in `src/lib/dati.ts`.

## Grafica

La grafica riprende la patch: **nero, verde bosco e bianco**, con titoli a mascherina.

| Cosa | Dove si definisce |
|---|---|
| **Colori** | `src/styles/palettes.css`: un blocco `:root` per il tema diurno e un blocco `.dark` per quello notturno |
| **Caratteri** | `src/styles/fonts.css`: Big Shoulders Stencil (titoli grandi), Barlow Condensed (titoli), Consolas per testo e dati. Consolas è di Microsoft e c'è solo su Windows: altrove il sito serve Inconsolata, il suo equivalente open source |
| **Stile del contenuto** | `src/styles/global.css` |

- Chi visita il sito sceglie il tema con il pulsante sole/luna in testata; all'inizio si segue l'impostazione del dispositivo.
- Per cambiare un colore, modifica il valore del token (`--primary`, `--background`, `--card`…) **in entrambi i blocchi**, diurno e notturno. Il testo deve restare leggibile sullo sfondo: per il testo normale serve un contrasto di almeno 4,5:1.
- I font sono pacchetti npm [Fontsource](https://fontsource.org) importati in `fonts.css`: nessuna richiesta a Google. Per cambiarne uno: `npm install @fontsource/nome-del-font`, sostituisci gli `@import` e il nome nella variabile corrispondente (`--ff-display`, `--ff-heading`, `--ff-body`, `--ff-data`), poi `npm uninstall` del pacchetto che non serve più.
- Dettagli ricorrenti, definiti in `global.css`: `.hud` (angoli a squadra), `.notch` (angoli smussati), `.hazard` (nastro segnaletico), `.stamp` (timbro), `.map-grid` (griglia topografica), `.celle` (griglia di caselle), `.kicker` (riga di servizio in maiuscolo), `.display` e `.heading` (titoli).

### Aggiungere un componente shadcn

I componenti di base (pulsanti, schede, caselle di spunta, menu a tendina…) sono [shadcn/ui](https://ui.shadcn.com), stile `radix-lyra` con icone Phosphor, come da `components.json`. Il codice sta in `src/components/ui/` ed è modificabile. Per aggiungerne uno:

```sh
npx shadcn@latest add nome-del-componente   # es. accordion, dialog
```

Il file compare in `src/components/ui/`; controlla con `git status` e `git diff` che cosa è cambiato. Un componente shadcn è React: si usa dentro un componente `.tsx` (come `GearBoard.tsx`), che a sua volta si inserisce in una pagina con `client:load` o `client:visible`.

## Animazioni

- **Home**: all'apertura il titolo compare parola per parola, il contorno del Veneto si disegna e sopra compare la patch. Sta tutto nel blocco `<style>` in fondo a `src/pages/index.astro`, con i tempi (in secondi) accanto a ogni regola.
- **Pagina non trovata**: la scena del mirino e del timbro sta in `src/pages/404.astro`.
- Sono solo CSS, senza librerie. Chi ha attivato «riduci animazioni» sul proprio dispositivo vede direttamente il risultato finale.

### Easter egg

Il sito ha uno scherzo nascosto: i soprannomi della squadra che si presentano in pixel art. Parte con **tre clic (o tocchi) veloci** sulla patch della home o sul logo nel piè di pagina, oppure scrivendo sulla tastiera il soprannome di un personaggio. Si chiude con `Esc` o con il pulsante.

- Disegni e battute: `src/lib/squadra.ts`. La scena: `src/components/EasterEgg.astro`.
- Per toglierlo: elimina la riga `<EasterEgg />` (e il relativo `import`) da `src/layouts/Base.astro`.

## Pubblicazione

La pubblicazione è automatica, con GitHub Actions (`.github/workflows/deploy.yml`):

1. a ogni push su `master` (oppure a mano da **Actions → Pubblica su GitHub Pages → Run workflow**) GitHub installa le dipendenze con Node 22, compila il sito (`npm run build`) e pubblica la cartella `dist/`;
2. il sito si aggiorna in pochi minuti; l'esito si vede nella scheda **Actions**;
3. se la compilazione fallisce, non viene pubblicato nulla e online resta la versione precedente.

> **IMPORTANTE, da fare una volta sola.** Su GitHub apri **Settings → Pages → Build and deployment → Source** e cambia da **«Deploy from a branch»** a **«GitHub Actions»**. Va fatto **prima o insieme al primo push su `master`** con questa versione: nella radice del repository non ci sono più le pagine HTML, quindi con la vecchia impostazione il sito pubblicato si romperebbe.

Se un giorno il repository cambia nome o dominio, aggiorna `site` e `base` in `astro.config.mjs` (oggi `/wiki`) e `SITE.repo` in `src/lib/site.ts` (il link «Modifica su GitHub»): senza, link, immagini e stili puntano a indirizzi sbagliati.

## Compatibilità dei vecchi link

Le pagine hanno gli stessi nomi di file e le stesse ancore di prima, quindi i link già condivisi continuano a funzionare:

- file: `index.html`, `onboarding.html`, `team-rules.html`, `game-rules.html`, `join.html` (`radio.html` non è pubblicata finché la pagina Radio resta [scollegata](#pagina-radio-scollegata));
- ancore, per esempio `team-rules.html#ingaggio`, `game-rules.html#normativa`, `join.html#faq`, `onboarding.html#errori-da-evitare`;
- pagine nuove: `giornata.html`, `replica.html` e `glossario.html`; chi apre un indirizzo che non esiste vede `404.html`.

Il merito è di `build: { format: 'file' }` in `astro.config.mjs`: non cambiarlo, altrimenti le pagine uscirebbero come `nome/index.html`. Cambiano solo gli indirizzi dei file di supporto (stile e script, che prima stavano in `assets/`). Il logo resta raggiungibile al vecchio indirizzo `assets/img/logo.png`, grazie alla copia in `public/assets/img/`.

Regola per chi modifica: **non rinominare le pagine e non cambiare gli `id` delle sezioni** senza aggiornare tutti i link che le citano.
