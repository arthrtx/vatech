'use client';

import { useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/*
| Botões colados: cantos só nas pontas e 1px de margem negativa para as bordas
| adjacentes não somarem 2px. O `z-10` no foco e no hover é o que impede o anel
| de foco de ficar por baixo do botão seguinte — sem ele, o indicador aparece
| cortado exactamente no elemento que está a ser percorrido por teclado.
*/
const buttonGroup = cva('isolate inline-flex [&>*]:relative [&>*:focus-visible]:z-10 [&>*:hover]:z-10', {
  variants: {
    orientation: {
      horizontal:
        'flex-row [&>*]:rounded-none [&>*:not(:first-child)]:-ml-px [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md',
      vertical:
        'flex-col [&>*]:rounded-none [&>*:not(:first-child)]:-mt-px [&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md',
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});

export type ButtonGroupProps = React.ComponentProps<'div'> &
  VariantProps<typeof buttonGroup> & {
    /** Nome do grupo para leitor de ecrã. Um grupo sem nome é uma lista de botões soltos. */
    'aria-label'?: string;
  };

/**
 * Conjunto de acções relacionadas, apresentadas como um bloco.
 *
 * As setas percorrem os botões do grupo. É o comportamento que um grupo de
 * controlos tem de ter — sem isto, o Tab pára em cada botão e uma barra de
 * seis acções custa seis tabulações a atravessar.
 *
 * Usar variantes `outline` ou `subtle` cá dentro: a sombra dura do `solid`
 * desenha-se por baixo de cada botão e quebra a ilusão de peça única.
 */
export function ButtonGroup({ className, orientation, onKeyDown, ...props }: ButtonGroupProps) {
  const referencia = useRef<HTMLDivElement>(null);

  function aoTeclado(evento: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(evento);
    if (evento.defaultPrevented) return;

    const anterior = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const seguinte = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const teclas = [anterior, seguinte, 'Home', 'End'];
    if (!teclas.includes(evento.key)) return;

    const alvos = Array.from(
      referencia.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [],
    );
    if (alvos.length === 0) return;

    const actual = alvos.indexOf(document.activeElement as HTMLElement);
    if (actual === -1) return;

    // Circular: da última seta para a direita volta-se à primeira.
    let destino = actual;
    if (evento.key === anterior) destino = (actual - 1 + alvos.length) % alvos.length;
    if (evento.key === seguinte) destino = (actual + 1) % alvos.length;
    if (evento.key === 'Home') destino = 0;
    if (evento.key === 'End') destino = alvos.length - 1;

    evento.preventDefault();
    alvos[destino]?.focus();
  }

  return (
    <div
      ref={referencia}
      role="group"
      onKeyDown={aoTeclado}
      className={cn(buttonGroup({ orientation }), className)}
      {...props}
    />
  );
}
