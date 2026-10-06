import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useSpunte } from '@/hooks/use-spunte';
import type { GruppoChecklist } from '@/lib/dati';
import { cn } from '@/lib/utils';

// Lista di controllo con le spunte ricordate sul dispositivo (data/checklist.json).

export default function Checklist({ gruppi, chiave = 'bcu-checklist' }: { gruppi: GruppoChecklist[]; chiave?: string }) {
  const { spunte, alterna, azzera } = useSpunte(chiave);
  const totale = gruppi.reduce((somma, g) => somma + g.voci.length, 0);
  // L'identificativo salvato dipende dal testo della voce, non dalla posizione:
  // se in data/checklist.json si aggiunge o si sposta una voce, le spunte già messe restano al loro posto.
  const idVoce = (gruppo: GruppoChecklist, voce: string) => `${gruppo.id}:${voce}`;
  const fatte = gruppi.reduce((somma, g) => somma + g.voci.filter((voce) => spunte.has(idVoce(g, voce))).length, 0);

  return (
    <div className="not-doc">
      <div className="no-print z-10 [@media(min-height:36rem)]:sticky [@media(min-height:36rem)]:top-(--header-h) -mx-4 flex items-center gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="kicker mb-2">
            Fatte {fatte} di {totale}
          </p>
          <Progress className="h-2" value={totale ? (fatte / totale) * 100 : 0} aria-label="Voci completate" />
        </div>
        <Button variant="outline" className="h-10 gap-2 px-3 text-sm" onClick={azzera} disabled={spunte.size === 0}>
          <ArrowCounterClockwiseIcon />
          Azzera
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {gruppi.map((gruppo) => {
          const fatteGruppo = gruppo.voci.filter((voce) => spunte.has(idVoce(gruppo, voce))).length;
          return (
            <section key={gruppo.id} id={gruppo.id} className="hud border bg-card" aria-labelledby={`${gruppo.id}-titolo`}>
              <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
                <h3 id={`${gruppo.id}-titolo`} className="heading text-lg">
                  {gruppo.titolo}
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {fatteGruppo}/{gruppo.voci.length}
                </span>
              </div>
              <ul>
                {gruppo.voci.map((voce, i) => {
                  const id = idVoce(gruppo, voce);
                  const idCampo = `spunta-${gruppo.id}-${i}`;
                  const fatta = spunte.has(id);
                  return (
                    <li key={id} className="border-b last:border-b-0">
                      <label htmlFor={idCampo} className="flex min-h-12 cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted">
                        <Checkbox
                          id={idCampo}
                          className="mt-0.5 size-5"
                          checked={fatta}
                          onCheckedChange={(valore) => alterna(id, valore === true)}
                        />
                        <span className={cn('leading-snug', fatta && 'text-muted-foreground line-through decoration-1')}>{voce}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
