import { useMemo, useState } from 'react';
import { ArrowCounterClockwiseIcon, ArrowUpRightIcon } from '@phosphor-icons/react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSpunte } from '@/hooks/use-spunte';
import { PRIORITA, descriviFascia, formattaFascia, sommaFasce, type Voce } from '@/lib/equipaggiamento';
import { cn } from '@/lib/utils';

// Elenco dell'equipaggiamento (data/equipaggiamento.json) raggruppato per priorità,
// con filtro per categoria e calcolo del budget: spuntando "Ce l'ho già" la voce esce dal conto.

const TUTTE = 'tutte';

export default function GearBoard({ voci }: { voci: Voce[] }) {
  const { spunte: possedute, alterna, azzera } = useSpunte('bcu-equipaggiamento');
  const [categoria, setCategoria] = useState(TUTTE);

  const categorie = useMemo(() => [...new Set(voci.map((v) => v.categoria))], [voci]);
  const gruppi = PRIORITA.map((p) => ({ ...p, voci: voci.filter((v) => v.priorita === p.id) })).filter(
    (g) => g.voci.length > 0,
  );
  const obbligatorie = voci.filter((v) => v.priorita !== 'consigliato');
  const obbligatoriePossedute = obbligatorie.filter((v) => possedute.has(v.id)).length;

  return (
    <div className="mt-14 grid gap-14">
      <section id="budget" className="doc-section !mt-0" aria-labelledby="budget-titolo">
        <div className="doc-section-head">
          <h2 id="budget-titolo">Budget</h2>
          <a className="anchor no-print" href="#budget" aria-label="Link alla sezione Budget">
            #
          </a>
        </div>
        <div className="not-doc hud border bg-card">
          <div className={cn('grid divide-y sm:divide-x sm:divide-y-0', gruppi.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
            {gruppi.map((gruppo) => {
              const totale = sommaFasce(gruppo.voci);
              const mancante = sommaFasce(gruppo.voci.filter((v) => !possedute.has(v.id)));
              const tutto = gruppo.voci.every((v) => possedute.has(v.id));
              const proposte = gruppo.voci.filter((v) => v.bozza).length;
              return (
                <div key={gruppo.id} className="p-4 sm:p-5">
                  <p className="kicker">{gruppo.titolo}</p>
                  <p className="heading mt-2 text-3xl text-primary">
                    {totale.senzaPrezzo === gruppo.voci.length ? 'Variabile' : formattaFascia(totale)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {gruppo.voci.length} {gruppo.voci.length === 1 ? 'voce' : 'voci'}
                    {proposte > 0 && `, di cui ${proposte} in bozza`}
                    {totale.senzaPrezzo > 0 && `; ${totale.senzaPrezzo} a prezzo variabile, fuori dal conto`}
                  </p>
                  <p className="mt-3 border-t pt-3 text-sm">
                    <span className="kicker block">Ti manca ancora</span>
                    <span className="font-mono text-base font-medium">{tutto ? 'niente' : descriviFascia(mancante)}</span>
                  </p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 sm:px-5">
            <div className="min-w-48 flex-1">
              <p className="kicker mb-2">
                Obbligatorio già in tuo possesso: {obbligatoriePossedute} di {obbligatorie.length}
              </p>
              <Progress
                className="h-2"
                value={obbligatorie.length ? (obbligatoriePossedute / obbligatorie.length) * 100 : 0}
                aria-label="Equipaggiamento obbligatorio già in possesso"
              />
            </div>
            <Button variant="outline" className="h-10 gap-2 px-3 text-sm" onClick={azzera} disabled={possedute.size === 0}>
              <ArrowCounterClockwiseIcon />
              Azzera le spunte
            </Button>
          </div>
        </div>
        <p className="note">
          Spunta «Ce l'ho già» sulle voci che possiedi: il conto si aggiorna e resta salvato su questo dispositivo.
        </p>

        <div className="not-doc !mt-6">
          <p className="kicker mb-2" id="filtro-categoria">
            Filtra per categoria
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={categoria}
            onValueChange={(valore) => setCategoria(valore || TUTTE)}
            aria-labelledby="filtro-categoria"
            className="w-full flex-wrap"
          >
            {[TUTTE, ...categorie].map((c) => (
              <ToggleGroupItem
                key={c}
                value={c}
                className="h-10 px-3.5 text-sm capitalize data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </section>

      {gruppi.map((gruppo) => {
        const visibili = gruppo.voci.filter((v) => categoria === TUTTE || v.categoria === categoria);
        return (
          <section key={gruppo.id} id={gruppo.ancora} className="doc-section !mt-0" aria-labelledby={`${gruppo.ancora}-titolo`}>
            <div className="doc-section-head">
              <h2 id={`${gruppo.ancora}-titolo`}>{gruppo.titolo}</h2>
              <a className="anchor no-print" href={`#${gruppo.ancora}`} aria-label={`Link alla sezione ${gruppo.titolo}`}>
                #
              </a>
            </div>
            {visibili.length === 0 ? (
              <p className="note">Nessuna voce di questa categoria in questo gruppo.</p>
            ) : (
              <div className="not-doc grid gap-4 md:grid-cols-2">
                {visibili.map((voce) => (
                  <Scheda
                    key={voce.id}
                    voce={voce}
                    posseduta={possedute.has(voce.id)}
                    onCambia={(attiva) => alterna(voce.id, attiva)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Scheda({ voce, posseduta, onCambia }: { voce: Voce; posseduta: boolean; onCambia: (attiva: boolean) => void }) {
  const idSpunta = `possiedo-${voce.id}`;
  return (
    <article
      id={voce.id}
      data-stato={voce.bozza ? 'bozza' : undefined}
      className={cn('hud flex flex-col border bg-card p-4 sm:p-5', voce.bozza && 'border-dashed')}
    >
      {/* Le voci già possedute si attenuano senza usare l'opacità, che renderebbe il testo poco leggibile. */}
      <div className={cn('flex flex-1 flex-col', posseduta && 'text-muted-foreground')}>
        <div className="flex items-start justify-between gap-3">
          <p className="kicker pt-0.5">{voce.categoria}</p>
          {voce.bozza && <span className="stamp text-signal">Bozza</span>}
        </div>
        <h3 className={cn('heading mt-1.5 text-xl', posseduta && 'line-through decoration-1')}>{voce.nome}</h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed">{voce.perche}</p>
        {voce.note && <p className="mt-2 border-l-2 pl-3 text-sm leading-relaxed text-muted-foreground">{voce.note}</p>}
        <p className="mt-auto pt-4">
          <span className="kicker block">Prezzo indicativo</span>
          <span className="font-mono text-[0.9375rem] font-medium">{voce.prezzo}</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
        <label htmlFor={idSpunta} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox id={idSpunta} className="size-5" checked={posseduta} onCheckedChange={(valore) => onCambia(valore === true)} />
          Ce l'ho già
        </label>
        {voce.link && voce.link.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap gap-2">
            {voce.link.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  // Il nome del negozio può essere lungo: su schermi stretti va a capo invece di allargare la scheda.
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-auto min-h-10 gap-1.5 px-3 py-1.5 text-left text-sm whitespace-normal')}
                >
                  {link.negozio}
                  <ArrowUpRightIcon aria-hidden="true" />
                  <span className="sr-only">
                    : {voce.nome} (si apre in una nuova scheda)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          voce.bozza && <span className="text-sm text-muted-foreground">Modello da scegliere</span>
        )}
      </div>
    </article>
  );
}
