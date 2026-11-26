'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

export type Theme = 'system' | 'light' | 'dark';

/*
| O atributo que o contrato de cor lê chama-se `data-tema` e os seus valores
| são "claro" e "escuro" (ver src/contract.css). A prop é em inglês como todo o
| código; a tradução acontece aqui, num sítio só.
*/
const ATRIBUTO: Record<Exclude<Theme, 'system'>, string> = {
  light: 'claro',
  dark: 'escuro',
};

/*
| O vocabulário (`ICONES`) tem entrada própria para os três estados:
| `temaClaro` (Sun), `temaEscuro` (Moon) e `temaSistema` (MonitorCog). O
| `ecraDeParede` (Monitor liso) não serve aqui — já significa outra coisa no
| menu de navegação, e é por isso que o "sistema" tem o seu próprio ícone
| (MonitorCog, com a roda) em vez de reaproveitar aquele.
*/
const OPCOES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'system',
    label: 'Tema do sistema',
    icon: <Icone de={ICONES.temaSistema} />,
  },
  {
    value: 'light',
    label: 'Tema claro',
    icon: <Icone de={ICONES.temaClaro} />,
  },
  {
    value: 'dark',
    label: 'Tema escuro',
    icon: <Icone de={ICONES.temaEscuro} />,
  },
];

const ATRIBUTO_NOME = 'data-tema';

/** Lê o tema tal como está na raiz. Fonte única — não há cópia em estado. */
function lerDaRaiz(): Theme {
  const actual = document.documentElement.getAttribute(ATRIBUTO_NOME);
  if (actual === ATRIBUTO.light) return 'light';
  if (actual === ATRIBUTO.dark) return 'dark';
  return 'system';
}

/*
| Observa o atributo. Não é só para os cliques deste componente: um segundo
| selector de tema noutro sítio da página, ou um script externo, mudam a raiz
| sem passar por aqui — e sem o observador este botão ficava a mostrar o tema
| errado.
*/
function subscrever(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ATRIBUTO_NOME],
  });
  return () => observador.disconnect();
}

export type ThemeToggleProps = React.ComponentProps<'div'>;

/**
 * Alterna o tema na raiz do documento.
 *
 * Três estados e não dois: sem "sistema" não há volta atrás — depois do
 * primeiro clique a preferência do sistema operativo deixa de ser respeitada
 * para sempre, e quem tem o portátil a mudar de tema ao fim do dia fica preso
 * ao que escolheu de manhã.
 */
export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  /*
  | O tema NÃO vive em estado do React — vive no atributo `data-tema` da raiz
  | do documento, que é o que o contrato de cor lê. `useSyncExternalStore` é a
  | forma de ler um sistema externo sem o duplicar.
  |
  | A versão anterior guardava-o em `useState` e sincronizava com dois efeitos:
  | um a ler o atributo ao montar, outro a escrevê-lo, com um `ref` a saltar a
  | primeira passagem. Isso é uma cópia do estado do DOM que pode divergir dele,
  | e o `setState` síncrono dentro do efeito provoca uma segunda renderização em
  | cascata a cada montagem (`react-hooks/set-state-in-effect`).
  |
  | Com esta forma, um tema escrito por um script anti-flash antes da hidratação
  | é simplesmente lido — não há passagem em que o componente discorde do que
  | está no ecrã.
  */
  const theme = useSyncExternalStore(subscrever, lerDaRaiz, () => 'system' as Theme);

  const setTheme = useCallback((valor: Theme) => {
    const raiz = document.documentElement;
    if (valor === 'system') raiz.removeAttribute(ATRIBUTO_NOME);
    else raiz.setAttribute(ATRIBUTO_NOME, ATRIBUTO[valor]);
  }, []);

  return (
    <div
      role="group"
      aria-label="Tema"
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-line bg-surface-2 p-1',
        className,
      )}
      {...props}
    >
      {OPCOES.map((opcao) => {
        const activo = theme === opcao.value;

        return (
          <button
            key={opcao.value}
            type="button"
            aria-pressed={activo}
            onClick={() => setTheme(opcao.value)}
            className={cn(
              'grid min-h-touch min-w-touch place-items-center rounded-pill transition-colors duration-[var(--ds-motion-base)] ease-ds',
              // Activo distingue-se por elevação e não só por cor: ganha a
              // superfície de cima e a sombra que as outras não têm.
              activo
                ? 'bg-surface-1 text-text-1 shadow-surface'
                : 'text-text-3 hover:text-text-1',
            )}
          >
            {opcao.icon}
            <span className="ds-sr-only">{opcao.label}</span>
          </button>
        );
      })}
    </div>
  );
}
