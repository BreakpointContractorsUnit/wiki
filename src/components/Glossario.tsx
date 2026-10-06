import { useId, useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Termine } from '@/lib/dati';

// Glossario (data/glossario.json) con ricerca istantanea.

const semplifica = (testo: string) => testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Glossario({ termini }: { termini: Termine[] }) {
  const id = useId();
  const [ricerca, setRicerca] = useState('');

  const ordinati = useMemo(() => [...termini].sort((a, b) => a.termine.localeCompare(b.termine, 'it', { sensitivity: 'base' })), [termini]);
  const chiave = semplifica(ricerca.trim());
  const trovati = chiave ? ordinati.filter((t) => semplifica(`${t.termine} ${t.definizione}`).includes(chiave)) : ordinati;

  return (
    <div className="not-doc">
      <div className="no-print z-10 -mx-4 border-b bg-background/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:border sm:px-4 [@media(min-height:36rem)]:sticky [@media(min-height:36rem)]:top-(--header-h)">
        <Label htmlFor={id} className="sr-only">
          Cerca un termine
        </Label>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            type="search"
            value={ricerca}
            onChange={(evento) => setRicerca(evento.target.value)}
            placeholder="Cerca: hop-up, CQB, dichiararsi…"
            autoComplete="off"
            className="h-11 pl-10 text-base md:text-base"
          />
        </div>
        <p className="mt-1.5 font-mono text-xs text-muted-foreground" aria-live="polite">
          {trovati.length} {trovati.length === 1 ? 'termine' : 'termini'}
          {chiave && ` su ${ordinati.length}`}
        </p>
      </div>

      {trovati.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nessun termine trovato. Prova con un'altra parola, o chiedi in squadra.</p>
      ) : (
        <dl className="celle mt-6 md:grid-cols-2">
          {trovati.map((t) => (
            <div key={t.termine} className="p-4">
              <dt className="heading text-lg text-primary">{t.termine}</dt>
              <dd className="mt-1 text-[0.9375rem] leading-relaxed">{t.definizione}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
