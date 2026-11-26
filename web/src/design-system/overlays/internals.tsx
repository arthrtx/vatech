/*
| Peças internas da família de overlays. NÃO saem no barril — são detalhe de
| implementação partilhado por Modal, Drawer, ConfirmDialog, Toast, Alert e
| Banner.
|
| Os desenhos vêm do vocabulário do design system (`../icons`) e não mais de
| SVG à mão — ver `icons/vocabulario.ts` para a razão. O disco de espera não
| está aqui: é o `Spinner` das primitivas, que o `Button` já mostra sozinho.
*/

import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { IconButton, type IconButtonProps } from '../primitives';
import { Icone, ICONES } from '../icons';

type IconeProps = ComponentProps<'svg'>;

/*
| Todos ao mesmo tamanho do desenho anterior (`size-5`, 20px = medida="lg") e
| com o `strokeWidth` que o `Icone` já fixa (1.75) — igual ao que estes SVG
| tinham antes. Só `className` é usada dos props recebidos: nenhum consumidor
| (Banner/Alert/Toast/ConfirmDialog/DropdownMenu) passa mais nada além dela.
*/

/** Informação neutra. */
export function IconeInfo({ className }: IconeProps) {
  return <Icone de={ICONES.info} medida="lg" className={className} />;
}

/** Sucesso, concluído, saudável. */
export function IconeBom({ className }: IconeProps) {
  return <Icone de={ICONES.bom} medida="lg" className={className} />;
}

/*
| Aviso e Grave distinguem-se por FORMA, não por cor — círculo e triângulo.
|
| É a propriedade que o SVG à mão tinha e que não se pode perder: em
| `Toast`/`Alert`/`Banner` os dois tons aparecem lado a lado, e quem não
| distingue laranja de vermelho fica sem os distinguir de todo se a forma for a
| mesma. Houve uma versão do `vocabulario.ts` em que ambos apontavam para o
| triângulo; foi corrigida antes de sair da vaga.
*/

/** Aviso — círculo, a forma menos alarmante do trio de alerta. */
export function IconeAviso({ className }: IconeProps) {
  return <Icone de={ICONES.aviso} medida="lg" className={className} />;
}

/** Grave mas não fatal: degradado, atrasado, quase esgotado. */
export function IconeGrave({ className }: IconeProps) {
  return <Icone de={ICONES.grave} medida="lg" className={className} />;
}

/*
| Crítico — octógono, a forma mais distinta do conjunto, de propósito. É o
| sinal de STOP, e é o que o SVG desenhado à mão aqui já era: a escolha
| sobreviveu à passagem para o lucide (`OctagonAlert`) em vez de se dissolver
| num círculo como os outros.
*/
export function IconeCritico({ className }: IconeProps) {
  return <Icone de={ICONES.critico} medida="lg" className={className} />;
}

/** Fechar. Nunca aparece sozinho — vai sempre dentro de um botão com nome. */
export function IconeFechar({ className }: IconeProps) {
  return <Icone de={ICONES.fechar} medida="lg" className={className} />;
}

/** Indica que um item de menu abre um sub-menu. */
export function IconeAvancar({ className }: IconeProps) {
  return <Icone de={ICONES.seguinte} medida="lg" className={className} />;
}

/*
| O `IconButtonProps` passou a ser uma união discriminada (`asChild` recusa
| `isLoading`), e um `Omit` sobre uma união distribui-se pelos dois ramos —
| espalhar `{...props}` de volta deixa de ser atribuível a nenhum deles.
|
| Extrai-se o ramo que este botão pode mesmo usar. Um botão de fechar de um
| overlay é sempre um `<button>`: com `asChild` o elemento vinha do consumidor,
| e o `Esc`, o foco preso e o fecho do Radix deixavam de ter onde assentar.
*/
export type BotaoFecharProps = Omit<
  Extract<IconButtonProps, { asChild?: false | undefined }>,
  'children' | 'asChild'
>;

/*
| Botão de fechar dos overlays. Não é um botão próprio: é o `IconButton` do
| sistema com o ícone de fechar já lá dentro — cinco componentes a desenhar o
| seu próprio botão de fechar era o mesmo controlo a divergir em cinco sítios.
|
| A única coisa que acrescenta é a medida: 44×44 sempre, também em desktop
| (`size-touch` sobrepõe-se ao tamanho do `IconButton` por vir depois no `cn`).
| É o alvo mais pequeno de qualquer overlay e o mais fácil de falhar com o
| polegar (WCAG 2.5.5).
|
| O nome acessível chama-se `aria-label` e é obrigatório no tipo, herdado do
| `IconButton`: um X sozinho não diz o que fecha.
*/
export function BotaoFechar({ className, ...props }: BotaoFecharProps) {
  return (
    <IconButton variant="ghost" tone="neutral" className={cn('size-touch', className)} {...props}>
      <IconeFechar />
    </IconButton>
  );
}
