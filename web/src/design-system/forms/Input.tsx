'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';
import { useFieldControl } from './Field';

/*
| A caixa de qualquer controlo de texto — input, textarea, select nativo e
| gatilho do select do Radix partilham-na.
|
| Está aqui, e não num ficheiro de utilidades, para o Input continuar a ser
| copiável sozinho a partir do registry: quem copia leva a caixa com ele.
|
| Duas decisões que não são óbvias:
|  - o degrau `sm` (32px) é densidade de desktop e NÃO chega para um dedo, por
|    isso todos os tamanhos partem de `min-h-touch` (44px) e só encolhem a
|    partir do corte `md`;
|  - o tipo parte de 16px em ecrã pequeno (`text-md`) porque abaixo disso o
|    Safari do iPhone dá zoom ao focar o campo e desalinha a página inteira.
*/
export const controlBase = cva(
  [
    'w-full rounded-md border bg-surface-2 text-text-1',
    'transition-colors duration-[var(--ds-motion-base)] ease-ds',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-touch px-3 text-md md:min-h-(--ds-control-h-sm) md:text-sm',
        md: 'min-h-touch px-4 text-md md:min-h-(--ds-control-h-md) md:text-base',
        lg: 'min-h-touch-comfort px-5 text-lg',
      },
      invalid: {
        true: 'border-critical',
        /*
          | O contorno em repouso é `text-3` e não `line`, e a troca não é
          | estética.
          |
          | A WCAG 1.4.11 pede 3:1 entre o que identifica um controlo e o que
          | está à volta. Medido no pixel composto, em `/login`: o `line` (10%
          | de alpha) dava 1.34:1 no escuro e 1.24:1 no claro, e o
          | preenchimento do campo contra a superfície envolvente dava 1.11 e
          | 1.07 — por nenhuma das três vias o campo se lia como campo. O
          | `line-strong` (18%) também não chega: 1.99 e 1.60.
          |
          | Nenhum token de LINHA do sistema atinge 3:1, porque nenhum foi
          | desenhado para isso: uma divisória ou o rebordo de um cartão são
          | decoração e a norma não os cobre. Um controlo é outra coisa. Até
          | existir um token próprio para contorno de controlo — que obriga a
          | mexer no contrato e na ponte do painel, e não cabe neste ficheiro —
          | o `text-3` é o único token ligado ao tema que passa nos dois:
          | 5.11:1 no escuro, 4.89:1 no claro. Está calibrado para ser o mais
          | fraco que ainda se lê, que é o que um contorno precisa de ser.
          |
          | O `hover` sobe para `text-2`. Antes subia para `line-strong`, que
          | agora seria um passo para TRÁS — o rato passava por cima e o campo
          | ficava menos visível do que em repouso.
          |
          | O foco não se toca: o anel de 2 px vive em `.ds-control-box`
          | (`styles.css`) e já dava ~17:1.
        */
        false: 'border-text-3 hover:border-text-2',
      },
      disabled: {
        true: 'cursor-not-allowed border-line bg-surface-3 hover:border-line',
        false: '',
      },
      readOnly: {
        // Só-leitura mantém o contraste do texto: o valor continua a interessar,
        // ao contrário de um campo desactivado. O que muda é o fundo deixar de
        // parecer editável.
        true: 'bg-surface-1',
        false: '',
      },
    },
    defaultVariants: { size: 'md', invalid: false, disabled: false, readOnly: false },
  },
);

export type InputProps = Omit<React.ComponentProps<'input'>, 'size' | 'prefix'> &
  Pick<VariantProps<typeof controlBase>, 'size' | 'invalid'> & {
    /** Prefixo dentro da caixa: ícone, símbolo de moeda, `https://`. */
    leading?: React.ReactNode;
    /** Sufixo dentro da caixa: unidade, ícone de acção, `.pt`. */
    trailing?: React.ReactNode;
    /** Classes da caixa exterior — não do `<input>`. É a caixa que se dimensiona. */
    className?: string;
  };

/**
 * Campo de texto de uma linha.
 *
 * `size` colide com o atributo nativo `size` do `<input>` (largura em
 * caracteres), que ninguém usa e que não é o que queremos aqui — por isso é
 * omitido dos props nativos em vez de renomeado.
 *
 * O `className` vai para a caixa exterior e não para o `<input>`: quem lhe passa
 * uma largura quer o campo com essa largura, não o texto lá dentro.
 */
export function Input({
  className,
  size,
  invalid,
  leading,
  trailing,
  id,
  required,
  ...props
}: InputProps) {
  const { invalid: invalido, ...ligacao } = useFieldControl({
    id,
    'aria-describedby': props['aria-describedby'],
    'aria-invalid': invalid ? true : props['aria-invalid'],
    required,
  });

  const desactivado = props.disabled === true;
  const soLeitura = props.readOnly === true;

  return (
    <div
      className={cn(
        'ds-control-box',
        controlBase({ size, invalid: invalido, disabled: desactivado, readOnly: soLeitura }),
        'flex items-center gap-3',
        /*
          | Rede para o desactivado que não vem por prop: um `<fieldset disabled>`
          | desactiva o `<input>` sem que ninguém passe `disabled` a este
          | componente, e sem isto a caixa continuava a parecer editável.
        */
        'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:border-line has-[input:disabled]:bg-surface-3',
        className,
      )}
    >
      {leading ? (
        <span aria-hidden="true" className="flex shrink-0 items-center text-text-3">
          {leading}
        </span>
      ) : null}

      <input
        {...props}
        {...ligacao}
        /*
          | `self-stretch` para a área clicável cobrir a altura toda da caixa —
          | sem isto, tocar na metade de baixo do campo não lhe dá foco.
          |
          | O anel de foco é da caixa exterior (`.ds-control-box` em
          | `styles.css`), não deste `<input>` — por isso apaga aqui o seu
          | próprio anel (`outline-hidden`). Sem isto ficam dois anéis: o da
          | caixa e o do input encostado por dentro dela.
        */
        className={cn(
          'w-full min-w-0 self-stretch bg-transparent text-text-1 outline-hidden',
          'placeholder:text-text-3',
          'disabled:cursor-not-allowed disabled:text-text-3',
          'read-only:text-text-2',
          /*
            | O `×` que o WebKit desenha sozinho em `type="search"` sai de cena.
            |
            | Tem de ser aqui e não no `className` de quem usa o componente: esse
            | vai para a **caixa exterior** (ver o comentário lá em cima), e o
            | pseudo-elemento pertence a este `<input>`. A primeira tentativa
            | pô-lo na caixa, a regra entrou no CSS servido e o `×` continuou no
            | ecrã — a classe existia, só não casava com nada.
            |
            | Quem tem `type="search"` neste sistema desenha o seu botão de
            | limpar (`SearchInput`), com alvo de 44px, nome acessível e o foco
            | devolvido ao campo. O nativo não tem nada disso e aparecia ao lado.
          */
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />

      {trailing ? <span className="flex shrink-0 items-center text-text-3">{trailing}</span> : null}

      {/*
        | Erro com ícone dentro da própria caixa. É o que impede o estado de
        | inválido de ser apenas "a borda ficou vermelha" para quem não
        | distingue a cor. A mensagem em texto vive no `Field`.
      */}
      {invalido && !trailing ? (
        <Icone de={ICONES.aviso} medida="md" className="text-critical" />
      ) : null}
    </div>
  );
}
