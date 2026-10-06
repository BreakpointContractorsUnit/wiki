import { ListIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PAGINE, SITE, href } from '@/lib/site';

// Menu a scomparsa per telefono e tablet (sotto i 1024px); su desktop c'è il menu in testata.
export default function MobileNav({ corrente }: { corrente: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon-lg" className="size-11 lg:hidden" aria-label="Apri il menu">
          <ListIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto text-base data-[side=right]:w-[min(22rem,88vw)] data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle>
            <span className="display text-2xl">Menu</span>
          </SheetTitle>
          <SheetDescription>
            <span className="kicker">{SITE.squadra}</span>
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu principale">
          <ul>
            {PAGINE.map((pagina) => {
              const attiva = pagina.slug === corrente;
              return (
                <li key={pagina.slug} className="border-b">
                  <a
                    href={href(pagina.slug)}
                    aria-current={attiva ? 'page' : undefined}
                    className="flex min-h-14 items-center gap-3 border-l-[3px] border-transparent px-4 py-3 hover:bg-muted aria-[current=page]:border-primary aria-[current=page]:bg-muted"
                  >
                    <pagina.icon className="size-5 shrink-0 text-primary" weight={attiva ? 'fill' : 'regular'} />
                    <span className="min-w-0">
                      <span className="heading block text-lg">{pagina.titolo && pagina.slug !== 'index' ? pagina.titolo : pagina.label}</span>
                      <span className="block text-sm leading-snug text-muted-foreground max-sm:hidden">{pagina.descr}</span>
                    </span>
                    <span className="kicker ml-auto self-start pt-1">{pagina.codice}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="kicker mt-auto p-4">{SITE.motto}</p>
      </SheetContent>
    </Sheet>
  );
}
