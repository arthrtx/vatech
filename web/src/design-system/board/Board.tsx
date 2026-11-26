import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Inline } from '../layout/Inline';
import { Text } from '../primitives/Text';
import { Icone, ICONES } from '../icons';

/*
| O CHASSIS de um quadro kanban: a faixa que rola, a coluna, a zona que recebe
| o cartão, e a linha que diz que a coluna está vazia. O cartão vive em
| `BoardCard.tsx` — ver lá o porquê da separação.
|
| PORQUÊ QUATRO E NÃO UM: a fronteira entre `BoardColumn` e `BoardColumnBody`
| não é gosto — é onde o motor de arrasto do consumidor pendura o `setNodeRef`.
| O cabeçalho tem de ficar FORA da zona que recebe o cartão: largar em cima do
| título de uma coluna tem de largar na coluna, e com o cabeçalho lá dentro o
| `isOver` acendia-se a meio de um gesto que ainda não chegou à zona de destino.
| Um componente só, com o cabeçalho por prop, obrigava a inventar um segundo
| canal de props (`bodyProps={{ ref, style }}`) — que é a forma de dizer
| «isto deviam ser dois componentes» com mais código.
|
| PORQUÊ NÃO HÁ ARRASTO AQUI: o design system tem quatro dependências
| (`class-variance-authority`, `clsx`, `radix-ui`, `tailwind-merge`) e não ganha
| uma quinta por causa desta família. O Board dá a FORMA; o motor vem do
| consumidor. Todos os componentes desta família estendem os props do elemento
| nativo, portanto `ref`, `style`, `data-*` e handlers arbitrários passam
| intactos — que é tudo o que o `@dnd-kit` (ou outro) precisa para pendurar
| `setNodeRef`, `transform`, `attributes` e `listeners`. É o mesmo princípio do
| `asChild` do `Button`: o sistema não decide o que não é seu.
|
|   const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
|   <BoardColumnBody ref={setNodeRef} state={isOver ? 'over' : 'neutral'}>
|
| MOBILE (REGRAS §5, «Scroll»): a página nunca rola na horizontal — rola o
| `Board`. O `min-w-0` não é redundante com o `w-full`: dentro de um flex ou
| grid o item tem `min-width:auto` e cresce até caber o conteúdo, o
| `overflow-x` nunca entra, e quem passa a rolar é a página. Foi a lição que o
| `Table` já tinha pago.
*/

/*
| A faixa. As colunas são IMPLÍCITAS (`grid-flow-col` + `auto-cols`), e é isso
| que fecha a lacuna que os dois quadros do painel tinham aberta: o `Grid` do
| sistema tem contagens fixas (1·2·3·4·6) e não sabe fazer
| `repeat(N, minmax(210px, 1fr))`, por isso os dois escreviam o
| `gridTemplateColumns` em `style` com o N vindo dos dados. Com colunas
| implícitas não é preciso N nenhum: cada filho gera a sua coluna, com a mesma
| regra de largura. Zero `style` inline, e o número de colunas deixa de ser
| assunto de quem usa.
|
| 210px é MEDIDO, não escolhido: é a largura de coluna do quadro de tarefas do
| painel. Os dois quadros usavam 210 e 230, e a diferença não era desenho — era
| o valor que cada um calhou de escrever. O sistema fixa o menor pela conta que
| interessa: 5 colunas × 210 + 4 × 12 de intervalo = 1098px, que cabe em
| `--ds-container-narrow` (1100px) sem rolar. Com 230 dava 1198 e um quadro de
| cinco colunas passava a rolar num painel que tem largura para ele.
|
| ⚠ LACUNA: 210px não tem token. A escala de espaço pára em 120px
| (`--ds-space-15`) e não há família de larguras de coluna. Fica literal e
| documentado; se um segundo consumidor precisar de outra largura, o valor
| promove-se a token em vez de se acrescentar uma variante aqui.
*/
export type BoardProps = React.ComponentProps<'div'>;

/**
 * A faixa de colunas de um quadro. Rola na horizontal dentro de si própria —
 * a página não.
 *
 * As colunas são os filhos: cada `BoardColumn` gera a sua, com no mínimo 210px
 * e a repartir o resto em partes iguais. Não há prop de contagem.
 *
 * O nome acessível e o foco são de quem usa: um quadro com arrasto tem cartões
 * focáveis e já se rola com o teclado, e nesse caso um `tabIndex={0}` aqui era
 * uma paragem de tabulação a mais. Um quadro só de leitura passa
 * `tabIndex={0} role="group" aria-label="…"` para poder ser rolado por teclado.
 */
export function Board({ className, ...props }: BoardProps) {
  return (
    <div
      className={cn(
        'grid w-full min-w-0 grid-flow-col auto-cols-[minmax(210px,1fr)] gap-3 overflow-x-auto pb-1',
        className,
      )}
      {...props}
    />
  );
}

/*
| A coluna. `role="group"` e não `<section>`: um `<section>` com nome é uma
| landmark, e cinco landmarks lado a lado enchem a lista de regiões de quem
| navega por leitor de ecrã sem acrescentar nada. `group` diz o que isto é —
| um conjunto de cartões com um nome — e não entra na navegação por regiões.
|
| O cabeçalho é PROP e não componente próprio, ao contrário do corpo, porque
| o título é preciso duas vezes: à vista e no `aria-label` do grupo. Com um
| `<BoardColumnHeader title="…">` separado, o consumidor escrevia o mesmo
| texto nos dois sítios — e o dia em que só corrigisse um, o nome acessível
| passava a mentir sem dar erro nenhum.
*/
export type BoardColumnProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  /** O nome da coluna. À vista no cabeçalho e no nome acessível do grupo. */
  title: string;
  /** Quantos cartões. Escrito, não contado a partir dos filhos — o quadro pode estar filtrado. */
  count: number;
  /**
   * Limite de trabalho em curso (WIP). Acima dele o contador passa a aviso —
   * **avisa, não bloqueia**: o objectivo é tornar visível o padrão de ter tudo
   * começado e nada terminado, não impedir ninguém de trabalhar.
   *
   * «Acima» é `count > limit`. Igual ao limite ainda está dentro dele.
   */
  limit?: number | null;
  /**
   * Qualificação da contagem, à direita dela: «· 3 fora de prazo». Uma coluna
   * cheia e uma coluna cheia de problemas não são a mesma notícia, e o número
   * sozinho não as distingue.
   */
  meta?: React.ReactNode;
};

export function BoardColumn({
  className,
  title,
  count,
  limit,
  meta,
  children,
  ...props
}: BoardColumnProps) {
  const acimaDoLimite = typeof limit === 'number' && count > limit;

  return (
    <div role="group" aria-label={title} className={cn('min-w-0', className)} {...props}>
      <Inline gap="xs" justify="between" align="baseline" className="px-1 pb-3">
        {/*
          O título é `Text` e não `Heading`: o degrau mais pequeno da escala de
          títulos é 16px (`size="md"`) e o cabeçalho de coluna é 13px. Forçar o
          tamanho por `className` num `Heading` é a armadilha conhecida — o
          `tailwind-merge` lê o `h4` de `text-h4` como nome de cor, colide com
          `text-text-1` e o tamanho desaparece sem erro. O nome da coluna já
          está no `aria-label` do grupo, portanto a estrutura não perde nada.
        */}
        <Text as="span" size="xs" weight="medium" tone="strong">
          {title}
        </Text>

        <Text
          as="span"
          size="xs"
          tone={acimaDoLimite ? 'warning' : 'muted'}
          className="ds-tabular"
        >
          {/*
            Nunca só cor (REGRAS §11): o aviso traz símbolo e traz texto. O
            símbolo fica `aria-hidden` — o ícone lido em voz alta é ruído — e
            o facto vai em texto para quem ouve.
          */}
          {acimaDoLimite ? (
            <span aria-hidden="true" className="mr-1 inline-flex items-center">
              <Icone de={ICONES.aviso} medida="sm" />
            </span>
          ) : null}
          {count}
          {typeof limit === 'number' ? `/${limit}` : ''}
          {acimaDoLimite ? <span className="ds-sr-only"> acima do limite</span> : null}
          {meta}
        </Text>
      </Inline>

      {children}
    </div>
  );
}

/*
| A zona que recebe o cartão. É este nó que leva o `setNodeRef` do droppable —
| e por isso é ele, e não a coluna, que tem de existir como componente.
|
| A altura mínima existe para uma coluna vazia continuar a ser um alvo com
| área: sem ela, largar numa coluna sem cartões é acertar numa linha de 1px. O
| `content-start` impede os cartões de se esticarem para preencher essa altura.
|
| ⚠ LACUNA: os dois quadros do painel escrevem `min-h-40` — 160px, um degrau
| da escala numérica do Tailwind acima do 8, que é onde ela deixa de coincidir
| com a da casa (CONVENCOES §3). Aqui usa-se o degrau MAIS PRÓXIMO que tem
| token, `--ds-space-15` (120px), que continua a dar alvo de sobra a uma coluna
| vazia. Se 120px vier a revelar-se curto, o valor certo promove-se a token —
| não se volta ao número solto.
*/
const corpo = cva(
  [
    'grid min-h-(--ds-space-15) content-start gap-2 rounded-md p-2',
    'transition-colors duration-[var(--ds-motion-base)] ease-ds',
  ].join(' '),
  {
    variants: {
      state: {
        /*
        | A coluna é uma CHAPA, não um contorno.
        |
        | Era `border border-line` sobre `bg-plane` — e `--plane` é a cor da
        | própria página, portanto a coluna não tinha fundo: existia só pelo fio
        | à volta. `--surface-2` é o único degrau da escala que se distingue da
        | página E do cartão de forma VISÍVEL. O `--surface-2` foi tentado e
        | chumbou na medição: 1.05 de contraste contra a página no claro, que é
        | invisível — e sem a borda a coluna deixava de se ler. O `--surface-3`
        | pesava. O `--ds-surface-tray` é onde ficou depois de três medições:
        | 1.11 no claro e 1.35 no escuro (claro: f9f9f7 · ededea · fcfcfb;
        | escuro: 0d0d0d · 2a2a29 · 1a1a19). Medido, não estimado.
        |
        | A direcção inverte-se entre temas — no claro a coluna é mais escura que
        | a página, no escuro é mais clara — e isso é do sistema de superfícies,
        | não desta decisão: o que importa é a coluna separar-se dos dois
        | vizinhos, e separa nos dois casos.
        */
        neutral: 'bg-surface-tray',
        /*
        | A coluna debaixo do cartão muda de fundo. Sem isto largar é às cegas:
        | com cinco colunas estreitas, qual delas recebe não é óbvio a olho.
        |
        | Passou a TINTA de acento e não a outro cinzento: com a coluna já em
        | `--surface-2`, o realce em cinzento seria a mesma cor da coluna e
        | desaparecia. E «é aqui que cai» diz-se melhor com a cor da acção do
        | que com mais um degrau da mesma escala neutra.
        |
        | Só o fundo muda, e só a cor é animada: numa faixa de sete colunas,
        | animar geometria a cada passagem do cursor é trabalho de composição
        | que não paga o que dá (CONVENCOES §6).
        */
        over: 'bg-accent-wash',
      },
    },
    defaultVariants: { state: 'neutral' },
  },
);

export type BoardColumnBodyProps = React.ComponentProps<'div'> & VariantProps<typeof corpo>;

/**
 * A zona da coluna que recebe cartões. Recebe o `ref` do droppable.
 *
 * ```tsx
 * const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
 *
 * <BoardColumnBody ref={setNodeRef} state={isOver ? 'over' : 'neutral'}>
 *   {cartoes.map((c) => <BoardCard key={c.id} … />)}
 * </BoardColumnBody>
 * ```
 */
export function BoardColumnBody({ className, state, ...props }: BoardColumnBodyProps) {
  return <div className={cn(corpo({ state }), className)} {...props} />;
}

/*
| A coluna vazia. Existe em vez de se usar o `EmptyState` da família `data`
| porque o `EmptyState` é o vazio de um ECRÃ inteiro: traz `p-card` (32px),
| borda tracejada, ícone de 48px, título, descrição e uma acção. Numa coluna de
| 210px isso enche a coluna toda para dizer «não há nada» — e um quadro tem
| tantas colunas vazias quantas as fases que ainda não começaram, o que faria
| do estado vazio o elemento mais pesado do ecrã.
|
| Aqui o vazio é informação de passagem, não um convite: uma linha discreta que
| se lê e se ignora.
*/
export type BoardColumnEmptyProps = React.ComponentProps<'p'>;

/** A linha que ocupa uma coluna sem cartões. Texto por omissão: «vazia». */
export function BoardColumnEmpty({ className, children, ...props }: BoardColumnEmptyProps) {
  return (
    <Text size="xs" tone="muted" className={cn('px-2 py-5 text-center', className)} {...props}>
      {children ?? 'vazia'}
    </Text>
  );
}
