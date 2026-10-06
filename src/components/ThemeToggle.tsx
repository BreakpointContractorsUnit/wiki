import { MoonIcon, SunIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { STORAGE } from '@/lib/site';

// Il tema attivo è la classe .dark su <html>, impostata prima del rendering dallo script in <head>:
// qui le icone si alternano via CSS, così non serve stato (né si rischia uno sfarfallio all'avvio).
export default function ThemeToggle() {
  function alterna() {
    const notturno = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(STORAGE.tema, notturno ? 'notturno' : 'diurno');
    } catch {
      // archiviazione non disponibile (navigazione privata): il tema vale solo per questa pagina
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="size-11"
      onClick={alterna}
      aria-label="Cambia tema: diurno o notturno"
      title="Tema diurno / notturno"
    >
      <SunIcon className="hidden size-5 dark:block" />
      <MoonIcon className="size-5 dark:hidden" />
    </Button>
  );
}
