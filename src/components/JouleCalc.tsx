import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

// Converte la velocità letta al cronografo in energia: E = ½ · m · v².
// Il regolamento chiede una potenza inferiore a 1,00 J.

const LIMITE_J = 1;
const PESI_G = [0.2, 0.23, 0.25, 0.28, 0.3, 0.32, 0.36, 0.4];
const MS_PER_FPS = 0.3048;
const SCALA_J = 1.5; // fondo scala della barra

const numero = (cifre: number) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: cifre, maximumFractionDigits: cifre });

export default function JouleCalc() {
  const id = useId();
  const [peso, setPeso] = useState('0.25');
  const [unita, setUnita] = useState<'fps' | 'ms'>('fps');
  const [velocita, setVelocita] = useState('280');

  // Solo cifre con eventuali decimali (virgola o punto), entro valori plausibili per un cronografo.
  const testo = velocita.trim().replace(',', '.');
  const v = Number(testo);
  const valida = /^\d+(\.\d+)?$/.test(testo) && v > 0 && v <= 1500;
  const ms = unita === 'fps' ? v * MS_PER_FPS : v;
  const joule = valida ? 0.5 * (Number(peso) / 1000) * ms * ms : 0;
  const entro = joule < LIMITE_J;
  // Velocità che corrisponde esattamente al limite: la replica deve restare al di sotto,
  // quindi i valori mostrati si arrotondano sempre per difetto.
  const maxMs = Math.sqrt((2 * LIMITE_J) / (Number(peso) / 1000));
  const maxFps = Math.floor(maxMs / MS_PER_FPS);
  const maxMsMostrato = Math.floor(maxMs * 10) / 10;

  return (
    <div className="not-doc hud border bg-card">
      <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
        <div>
          <p className="kicker" id={`${id}-peso`}>
            Peso del pallino (grammi)
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={1}
            value={peso}
            onValueChange={(valore) => valore && setPeso(valore)}
            aria-labelledby={`${id}-peso`}
            className="mt-2 w-full flex-wrap"
          >
            {PESI_G.map((g) => (
              <ToggleGroupItem
                key={g}
                value={String(g)}
                className="h-10 min-w-14 font-mono text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {numero(2).format(g)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div>
          <Label htmlFor={`${id}-velocita`} className="kicker">
            Velocità al cronografo
          </Label>
          <div className="mt-2 flex gap-2">
            <Input
              id={`${id}-velocita`}
              inputMode="decimal"
              value={velocita}
              onChange={(evento) => setVelocita(evento.target.value)}
              aria-invalid={!valida}
              aria-describedby={valida ? undefined : `${id}-errore`}
              className="h-10 flex-1 font-mono text-base md:text-base"
            />
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={unita}
              onValueChange={(valore) => valore && setUnita(valore as 'fps' | 'ms')}
              aria-label="Unità di misura"
            >
              <ToggleGroupItem value="fps" className="h-10 px-3 font-mono text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                fps
              </ToggleGroupItem>
              <ToggleGroupItem value="ms" className="h-10 px-3 font-mono text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                m/s
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {!valida && (
            <p id={`${id}-errore`} className="mt-2 text-sm text-destructive">
              Inserisci la velocità letta al cronografo: un numero maggiore di zero.
            </p>
          )}
        </div>
      </div>

      <div className="border-t p-4 sm:p-5" aria-live="polite">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p>
            <span className="kicker block">Energia</span>
            <span className={cn('heading text-4xl', valida ? (entro ? 'text-primary' : 'text-destructive') : 'text-muted-foreground')}>
              {valida ? `${numero(3).format(joule)} J` : '— J'}
            </span>
          </p>
          {valida && (
            <p className={cn('stamp text-xs', entro ? 'text-success' : 'text-destructive')}>
              {entro ? 'Entro il limite' : 'Fuori limite'}
            </p>
          )}
        </div>
        <div className="relative mt-4 h-2.5 bg-muted" aria-hidden="true">
          <div
            className={cn('h-full transition-[width]', entro ? 'bg-primary' : 'bg-destructive')}
            style={{ width: `${Math.min(100, (joule / SCALA_J) * 100)}%` }}
          />
          <div className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-foreground" style={{ left: `${(LIMITE_J / SCALA_J) * 100}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Con pallini da {numero(2).format(Number(peso))} g, per stare sotto 1,00 J la replica deve tirare a meno di{' '}
          <span className="font-mono text-foreground">{numero(0).format(maxFps)} fps</span> (
          <span className="font-mono text-foreground">{numero(1).format(maxMsMostrato)} m/s</span>).
        </p>
      </div>
    </div>
  );
}
