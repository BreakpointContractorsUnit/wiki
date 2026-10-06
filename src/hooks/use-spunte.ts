import { useCallback, useEffect, useState } from 'react';

// Insieme di voci spuntate, ricordato nel browser (localStorage) con la chiave indicata.
// Parte vuoto e si riempie dopo il primo rendering: così l'HTML generato in build
// coincide con quello iniziale del browser.
export function useSpunte(chiave: string) {
  const [spunte, setSpunte] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    function leggi() {
      try {
        const salvate: unknown = JSON.parse(localStorage.getItem(chiave) ?? '[]');
        if (Array.isArray(salvate)) setSpunte(new Set(salvate.filter((v) => typeof v === 'string')));
      } catch {
        // dato illeggibile o archiviazione non disponibile: si parte da zero
      }
    }
    leggi();
    // Se la stessa pagina è aperta in un'altra scheda, le spunte restano allineate.
    function suCambio(evento: StorageEvent) {
      if (evento.key === chiave) leggi();
    }
    window.addEventListener('storage', suCambio);
    return () => window.removeEventListener('storage', suCambio);
  }, [chiave]);

  const scrivi = useCallback(
    (nuove: ReadonlySet<string>) => {
      setSpunte(nuove);
      try {
        localStorage.setItem(chiave, JSON.stringify([...nuove]));
      } catch {
        // archiviazione non disponibile: le spunte valgono solo per questa visita
      }
    },
    [chiave],
  );

  const alterna = useCallback(
    (id: string, attiva: boolean) => {
      const nuove = new Set(spunte);
      if (attiva) nuove.add(id);
      else nuove.delete(id);
      scrivi(nuove);
    },
    [spunte, scrivi],
  );

  const azzera = useCallback(() => scrivi(new Set()), [scrivi]);

  return { spunte, alterna, azzera };
}
