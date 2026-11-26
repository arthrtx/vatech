'use client';

import { Children, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';

const BARRA =
  'h-0.5 w-6 rounded-pill bg-current transition duration-[var(--ds-motion-base)] ease-ds';

export type MobileNavProps = React.ComponentProps<'nav'> & {
  /** Nome do menu — serve o gatilho e a região de navegação. */
  label?: string;
  /** Bloco no fundo do painel: conta, idioma, tema. */
  footer?: React.ReactNode;
  /** Classes do gatilho, para o encaixar na barra onde vive. */
  triggerClassName?: string;
};

/**
 * Menu de navegação do telemóvel: gatilho de três barras que vira X e painel
 * a ocupar o ecrã.
 *
 * Não é um `Dialog` do Radix, e é decisão e não esquecimento: isto é um
 * *disclosure* — o gatilho continua visível e mantém-se dono do estado
 * (`aria-expanded` + `aria-controls`). Um `Dialog` traria prisão de foco e
 * `aria-modal`, que aqui prometeriam à tecnologia de apoio um comportamento
 * modal que este padrão não tem.
 *
 * O painel fechado usa `visibility: hidden` + `pointer-events: none`, e não só
 * `opacity: 0`. Duas razões, ambas apanhadas em produção: um elemento a
 * `opacity: 0` continua a apanhar os toques — o menu invisível comia os
 * cliques da página inteira — e continua na ordem de tabulação, pelo que quem
 * navega por teclado caía dentro de um menu que ninguém vê.
 *
 * O avesso também conta: com o painel ABERTO, o resto da concha fica `inert`
 * (ver o efeito abaixo). Sem prisão de foco nem `aria-modal` — continua a ser
 * um disclosure —, mas o que o painel tapa deixa de estar na ordem de
 * tabulação.
 */
export function MobileNav({
  label = 'Menu',
  footer,
  triggerClassName,
  className,
  children,
  ...props
}: MobileNavProps) {
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);
  const idPainel = useId();

  /*
    Aberto, tudo o que não é o gatilho nem o painel fica `inert` (R2-UI-7).

    O painel é opaco e cobre o ecrã, mas os controlos por baixo continuavam na
    ordem de tabulação: medido a 390px, depois dos itens do menu vinham 23
    paragens em botões tapados (criar tarefa, cronómetro, filtros, cartões) e o
    foco desaparecia do ecrã até voltar ao gatilho (WCAG 2.4.7 / 2.4.11).

    `inert` e não prisão de foco: o padrão continua a ser o disclosure do
    cabeçalho deste componente. Sobe-se do painel até ao `<body>` e marca-se
    cada irmão do caminho — o gatilho e o painel são irmãos, e é por isso que
    ficam de fora. Só se desfaz o que aqui se fez: o que já estava `inert` (um
    diálogo por baixo, por exemplo) continua.

    E fecha-se quando o painel deixa de se ver (a janela passou o `lg`, onde
    ele é `display: none`): aberto e invisível, o `inert` deixava a página
    inteira morta ao rato e ao teclado.
  */
  useEffect(() => {
    const nav = painel.current;
    const botao = gatilho.current;

    if (!aberto || !nav || !botao) return;

    const marcados: Element[] = [];

    for (let caminho: Element = nav; caminho.parentElement && caminho !== document.body; ) {
      const pai: Element = caminho.parentElement;

      for (const irmao of Array.from(pai.children)) {
        if (irmao === caminho || irmao === botao || irmao.hasAttribute('inert')) continue;

        irmao.setAttribute('inert', '');
        marcados.push(irmao);
      }

      caminho = pai;
    }

    const aoRedimensionar = () => {
      if (nav.getClientRects().length === 0) setAberto(false);
    };

    window.addEventListener('resize', aoRedimensionar);

    return () => {
      window.removeEventListener('resize', aoRedimensionar);
      for (const elemento of marcados) elemento.removeAttribute('inert');
    };
  }, [aberto]);

  // Esc fecha e devolve o foco ao gatilho — sem isto o foco fica num painel
  // que já não se vê, e o Tab seguinte parece não fazer nada.
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      gatilho.current?.focus();
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  // Tranca o scroll do corpo enquanto o painel está aberto. Guarda o valor
  // anterior em vez de assumir 'visible': a página pode já estar trancada por
  // um modal por baixo, e repor o default destrancava-a.
  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // Navegar fecha o menu. Delegado no painel em vez de exigido a cada item:
  // com navegação de cliente o URL muda sem desmontar nada, e um menu que
  // fica aberto por cima da página nova parece a app ter ignorado o toque.
  function aoClicar(evento: React.MouseEvent<HTMLElement>) {
    if ((evento.target as HTMLElement).closest('a')) setAberto(false);
  }

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((valor) => !valor)}
        // Acima do painel na pilha: o painel cobre o ecrã todo e taparia o
        // próprio botão que o fecha.
        className={cn(
          'relative z-[var(--ds-z-modal)] flex min-h-touch min-w-touch flex-col items-center justify-center gap-1.5 rounded-md text-text-1 lg:hidden',
          triggerClassName,
        )}
      >
        <span className="ds-sr-only">{label}</span>
        <span aria-hidden="true" className={cn(BARRA, aberto && 'translate-y-2 rotate-45')} />
        <span aria-hidden="true" className={cn(BARRA, aberto && 'opacity-0')} />
        <span aria-hidden="true" className={cn(BARRA, aberto && '-translate-y-2 -rotate-45')} />
      </button>

      <nav
        ref={painel}
        id={idPainel}
        aria-label={label}
        onClick={aoClicar}
        className={cn(
          'fixed inset-0 z-[var(--ds-z-overlay)] flex flex-col overflow-y-auto overscroll-contain bg-rail lg:hidden',
          // O padding de baixo soma a faixa do sistema: sem isto o último
          // item fica debaixo da barra de gestos do iOS e não se toca.
          'px-gutter-mobile pt-section-mobile pb-[calc(var(--ds-space-9)+env(safe-area-inset-bottom))]',
          'transition-[opacity,transform,translate,visibility] duration-[var(--ds-motion-panel)] ease-ds',
          aberto
            ? 'visible translate-y-0 opacity-100'
            : 'invisible translate-y-2 opacity-0 pointer-events-none',
          className,
        )}
        {...props}
      >
        <ul className="flex flex-col">
          {Children.map(children, (filho, indice) => (
            <li
              className={cn(
                'transition-[opacity,transform,translate] duration-[var(--ds-motion-reveal)] ease-ds',
                aberto ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              )}
              // Único valor que vai em `style` em toda a família: o atraso
              // depende do índice, logo não pode ser uma classe literal — o
              // Tailwind não gera o que não vê escrito. Ainda assim sai do
              // token, e não de um número à mão.
              style={{
                transitionDelay: aberto ? `calc(var(--ds-motion-stagger) * ${indice})` : '0ms',
              }}
            >
              {filho}
            </li>
          ))}
        </ul>

        {footer ? <div className="mt-auto pt-8">{footer}</div> : null}
      </nav>
    </>
  );
}
