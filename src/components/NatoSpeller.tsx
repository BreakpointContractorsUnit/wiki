import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ALFABETO, CIFRE } from '@/lib/radio';

// Scrivi una parola e la vedi compitata con l'alfabeto fonetico.

const PAROLE = new Map(ALFABETO.map(([lettera, parola]) => [lettera, parola]));

function compita(testo: string): { carattere: string; parola: string | null }[] {
  // Toglie gli accenti (è → e) e tiene lettere, cifre e spazi.
  const pulito = testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return [...pulito].map((carattere) => {
    if (PAROLE.has(carattere)) return { carattere, parola: PAROLE.get(carattere)! };
    if (/[0-9]/.test(carattere)) return { carattere, parola: CIFRE[Number(carattere)] };
    return { carattere, parola: null };
  });
}

export default function NatoSpeller({ esempio = 'Breakpoint' }: { esempio?: string }) {
  const id = useId();
  const [testo, setTesto] = useState(esempio);
  const compitato = compita(testo);

  return (
    <div className="not-doc hud border bg-card p-4 sm:p-5">
      <Label htmlFor={id} className="kicker">
        Prova: scrivi un nome o una sigla
      </Label>
      <Input
        id={id}
        value={testo}
        onChange={(evento) => setTesto(evento.target.value)}
        maxLength={40}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="mt-2 h-12 font-mono text-base tracking-widest uppercase md:text-base"
      />
      <div className="mt-4 flex min-h-12 flex-wrap gap-2" aria-live="polite">
        {!compitato.some((c) => c.parola) && <p className="text-sm text-muted-foreground">Scrivi lettere o numeri qui sopra.</p>}
        {compitato.map(({ carattere, parola }, i) =>
          parola ? (
            <span key={i} className="flex items-baseline gap-2 border bg-background px-2.5 py-1.5">
              <span className="font-mono text-xs text-primary">{carattere}</span>
              <span className="heading text-lg">{parola}</span>
            </span>
          ) : (
            <span key={i} className="w-3" aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  );
}
