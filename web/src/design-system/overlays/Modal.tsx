'use client';

import { Dialog } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { BotaoFechar } from './internals';

/*
| Véu. Também é o contentor que centra o painel: com flexbox, "colado em baixo
| no telemóvel, centrado no desktop" é uma troca de `items-*` e não um segundo
| conjunto de `translate` a corrigir. O painel vive lá dentro — padrão que o
| Radix documenta para permitir scroll do overlay inteiro.
*/
const veu = [
  'fixed inset-0 z-[var(--ds-z-overlay)] bg-overlay',
  'flex items-end justify-center overflow-y-auto pt-(--ds-space-10) sm:items-center sm:p-6',
  'opacity-100 transition-opacity duration-[var(--ds-motion-base)] ease-ds starting:opacity-0',
].join(' ');

/*
| As larguras saem dos contentores de conteúdo do sistema. Não existe token de
| largura de modal e inventar "520px" abria um número que ninguém sabe de onde
| veio — a medida de leitura (720px) é a mesma que faz sentido para um diálogo
| com texto.
| TODO: token em falta: --ds-modal-w-sm / --ds-modal-w-md / --ds-modal-w-lg
|
| A entrada usa `starting:` (@starting-style) e não keyframes: o estado inicial
| da inserção é declarativo e não obriga o design system a publicar animações
| próprias. Sem saída animada de propósito — o Radix desmonta de imediato e
| forçar `forceMount` só para ter fade de saída trocava um detalhe estético por
| conteúdo que fica no DOM depois de fechado.
*/
const painel = cva(
  [
    'relative z-[var(--ds-z-modal)] flex max-h-full w-full flex-col bg-surface-1 shadow-float-lg',
    // Folha inferior no telemóvel (raio só no topo), caixa elevada a partir de sm.
    'rounded-t-2xl sm:rounded-xl',
    // A barra de gestos do sistema come a última linha se não se descontar aqui.
    'pb-[env(safe-area-inset-bottom)] sm:pb-0',
    'translate-y-0 opacity-100 transition-[translate,opacity] duration-[var(--ds-motion-slow)] ease-ds',
    'starting:translate-y-8 starting:opacity-0',
  ],
  {
    variants: {
      size: {
        sm: 'sm:max-w-(--container-form)',
        md: 'sm:max-w-(--container-text)',
        lg: 'sm:max-w-(--container-narrow)',
        full: 'sm:h-full sm:max-w-(--container-max)',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type ModalProps = Omit<React.ComponentProps<typeof Dialog.Root>, 'children'> &
  VariantProps<typeof painel> & {
    /**
     * Título do diálogo. Obrigatório no tipo, não por gosto: sem ele o leitor
     * de ecrã anuncia "diálogo" e mais nada, e quem chegou por teclado fica
     * sem saber onde o foco foi parar.
     */
    title: string;
    /** Uma linha de contexto por baixo do título. */
    description?: string;
    /** Elemento que abre o modal. Recebe os handlers do Radix por `asChild`. */
    trigger?: React.ReactNode;
    /** Acções do rodapé, alinhadas à direita. A confirmar vai por último. */
    footer?: React.ReactNode;
    /**
     * Se o clique fora dispensa o diálogo. `true` por omissão.
     *
     * **Põe `false` em tudo o que tenha edições por gravar.** Um `<dialog>`
     * nativo com `showModal()` não fecha ao clicar no véu; este fecha, porque
     * o Radix trata o clique fora como dispensa. A troca é invisível na
     * migração e custa o que a pessoa escreveu.
     *
     * `Esc` continua a fechar em qualquer caso, de propósito: clicar fora é
     * acidente, `Esc` é deliberado, e é a saída de teclado que a WAI-ARIA
     * exige de um diálogo modal. Tirá-la trocava uma regressão por outra.
     *
     * Esta prop não chega para um diálogo cujo fecho **destrói** alguma coisa:
     * `Esc` e o botão de fechar continuam a sair, e os dois passam por
     * `onOpenChange(false)`. Quem controla o `open` decide aí — pedir
     * confirmação e manter `open` é o que trava a saída por reflexo.
     */
    dismissible?: boolean;
    /**
     * Para onde volta o foco ao fechar, quando o diálogo abre **sem `trigger`**.
     *
     * Guarda-se o `document.activeElement` no instante do clique — ainda dentro
     * do handler, antes de o diálogo montar e prender o foco — e passa-se a
     * `ref` aqui. Com `trigger` não é preciso: o Radix já sabe para onde voltar.
     */
    devolverFocoA?: React.RefObject<HTMLElement | null>;
    /**
     * Onde o foco entra ao abrir. Reencaminhada tal e qual para o Radix.
     *
     * Por omissão o Radix foca o primeiro elemento tabulável do painel, que é
     * sempre o botão de fechar do cabeçalho — a ordem é do cabeçalho, não de
     * quem escreve o conteúdo. Num diálogo em que esse primeiro botão **destrói
     * alguma coisa**, `evento.preventDefault()` aqui e um `focus()` no elemento
     * seguro passa a ser obrigatório. É o mesmo remédio que o `ConfirmDialog`
     * já aplica ao botão de cancelar.
     */
    onOpenAutoFocus?: React.ComponentProps<typeof Dialog.Content>['onOpenAutoFocus'];
    /**
     * O `Esc` **quando este diálogo é a camada de cima**. Reencaminhada tal e
     * qual para o Radix.
     *
     * Sem valor, o comportamento é o de sempre: `Esc` fecha, que é a saída de
     * teclado que a WAI-ARIA exige de um diálogo modal. Com valor,
     * `evento.preventDefault()` é o que trava a saída — é assim que um
     * formulário com edições por gravar pergunta antes de as deitar fora em
     * vez de fechar por reflexo. Sem `preventDefault()` o Radix segue e fecha
     * na mesma.
     *
     * ⚠ **A pergunta que esta prop responde é «há alguma coisa por cima?», e
     * quem a responde é o Radix, não quem a passa.** O `DismissableLayer`
     * mantém uma pilha de camadas e só regista a tecla na do topo: com um
     * popover, um menu ou outro diálogo abertos por cima, este handler **não
     * corre**, e o `Esc` fecha só essa camada de cima. É o que distingue esta
     * prop de um ouvinte posto na janela por quem monta o diálogo: esse corre
     * sempre, não sabe o que está por cima, e `stopPropagation()` não o trava
     * — não trava ouvintes registados no mesmo alvo, só a propagação para
     * outros nós. Qualquer camada dispensável nova entra na pilha de graça; um
     * ouvinte à parte tinha de ser ensinado a conhecê-las uma a uma.
     */
    onEscapeKeyDown?: React.ComponentProps<typeof Dialog.Content>['onEscapeKeyDown'];
    /**
     * Substitui o nome acessível do botão de fechar do cabeçalho.
     *
     * Por omissão é `Fechar: <title>`, que chega quando fechar não custa nada.
     * Quando custa — o diálogo mostra uma vez um valor que não volta — a
     * etiqueta tem de dizer a **consequência**: quem navega por leitor de ecrã
     * ouve só este nome, e «Fechar» não avisa de nada.
     */
    etiquetaFechar?: string;
    /**
     * Substitui o título **visível** do cabeçalho por conteúdo próprio.
     *
     * Para diálogos em que o título não é só uma etiqueta: um nome que se
     * edita no sítio, uma barra de acções que pertence ao objecto aberto e não
     * ao formulário. Sem isto, a página desenhava a sua barra por baixo deste
     * cabeçalho e o título aparecia duas vezes — que é o defeito que esta prop
     * existe para fechar.
     *
     * ⚠ **O `title` continua obrigatório e continua a ser o nome acessível**:
     * passa a `sr-only`, não desaparece. Um `Dialog.Title` que deixasse de
     * existir dava um diálogo anunciado como «diálogo» e mais nada, e o Radix
     * avisa na consola. A troca é de pintura, não de semântica.
     *
     * A `description`, se houver, sai do cabeçalho com o título: quem traz
     * conteúdo próprio desenha o seu contexto.
     */
    cabecalho?: React.ReactNode;
    /** Classes do painel — não do véu. */
    className?: string;
    children?: React.ReactNode;
  };

/**
 * Diálogo modal: prende o foco e fecha com `Esc`.
 *
 * ⚠ **A devolução do foco ao fechar depende de haver `trigger`.** O Radix faz
 * `preventDefault()` no `onCloseAutoFocus` e foca o `triggerRef` — que só
 * existe se o gatilho passar por aqui. Quem monta o diálogo a partir de outro
 * ficheiro (uma linha de tabela, um cartão de quadro) fica sem gatilho para
 * dar, e o foco cai no `<body>`. Esse caso resolve-se com `devolverFocoA`, e
 * não à mão: a devolução tem de correr no `onCloseAutoFocus`, que o `Modal`
 * não expunha, e não num efeito — o Radix decide o foco num `setTimeout`
 * posterior, e qualquer `focus()` feito antes disso é depois desfeito.
 *
 * No telemóvel deixa de ser caixa flutuante e passa a folha colada em baixo —
 * é onde o polegar chega. O conteúdo faz scroll dentro do painel; o cabeçalho
 * e o rodapé ficam fixos.
 */
export function Modal({
  title,
  description,
  trigger,
  footer,
  size,
  className,
  dismissible = true,
  devolverFocoA,
  onOpenAutoFocus,
  onEscapeKeyDown,
  etiquetaFechar,
  cabecalho,
  children,
  ...props
}: ModalProps) {
  /*
  | Sem descrição, o Radix procura na consola o elemento que ligaria por
  | aria-describedby e avisa. Anular o atributo é a saída documentada — e tem
  | de ser a chave a desaparecer, não o valor a ficar indefinido.
  */
  const semDescricao = description ? {} : { 'aria-describedby': undefined };

  return (
    <Dialog.Root {...props}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}

      <Dialog.Portal>
        <Dialog.Overlay className={veu}>
          <Dialog.Content
            {...semDescricao}
            /*
            | Só o ponteiro. `onInteractOutside` agregaria também o foco, e num
            | diálogo com o foco preso isso nunca dispara — travá-lo era pagar
            | um caso que não existe e arriscar prender saídas legítimas.
            */
            onPointerDownOutside={dismissible ? undefined : (evento) => evento.preventDefault()}
            /*
            | Sem valor, o Radix fica com o comportamento dele (primeiro
            | tabulável). Ver a nota da prop.
            */
            onOpenAutoFocus={onOpenAutoFocus}
            /*
            | Sem valor, o Radix fecha com `Esc` como sempre fez. Ver a nota da
            | prop — sobretudo a parte de só correr na camada do topo.
            */
            onEscapeKeyDown={onEscapeKeyDown}
            /*
            | O nosso handler corre ANTES do do Radix (`composeEventHandlers`),
            | e o `preventDefault()` é o que impede o Radix de focar o
            | `triggerRef` vazio a seguir. Sem elemento vivo para onde voltar
            | não se trava nada: o comportamento por omissão é melhor do que
            | focar um nó que já saiu do documento.
            */
            onCloseAutoFocus={
              devolverFocoA === undefined
                ? undefined
                : (evento) => {
                    const alvo = devolverFocoA.current;

                    if (alvo === null || !alvo.isConnected) return;

                    evento.preventDefault();
                    alvo.focus();
                  }
            }
            className={cn(painel({ size }), className)}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-4">
              {/*
              | `flex-1` só quando há conteúdo próprio: sem ele o bloco encolhe
              | ao texto do título, que é como os diálogos de sempre se
              | desenham. Uma barra de acções precisa da largura toda.
              */}
              <div className={cn('min-w-0', cabecalho ? 'flex-1' : undefined)}>
                {cabecalho ? (
                  <>
                    {/*
                    | O nome acessível fica, invisível. Ver a nota do `cabecalho`.
                    */}
                    <Dialog.Title className="sr-only">{title}</Dialog.Title>
                    {cabecalho}
                  </>
                ) : (
                  <>
                    <Dialog.Title className="text-md font-semibold text-balance text-text-1">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-text-2">
                        {description}
                      </Dialog.Description>
                    ) : null}
                  </>
                )}
              </div>
              <Dialog.Close asChild>
                <BotaoFechar aria-label={etiquetaFechar ?? `Fechar: ${title}`} className="-mr-2" />
              </Dialog.Close>
            </header>

            {/* min-h-0 é o que permite ao filho encolher e ganhar scroll próprio. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 text-md text-text-2">
              {children}
            </div>

            {footer ? (
              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
                {footer}
              </footer>
            ) : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
