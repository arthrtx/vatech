import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONE_DE_SEVERIDADE, type Severidade } from '../icons';
import { Card, CardBody } from '../layout/Card';
import { Inline } from '../layout/Inline';
import { Stack } from '../layout/Stack';
import { Text } from '../primitives/Text';

/*
| O cartão de um quadro.
|
| PORQUÊ FICHEIRO PRÓPRIO, e não junto ao chassis como o `TableRow` está junto
| ao `Table`: um `TableRow` fora de uma `<table>` não é nada, mas um `BoardCard`
| fora de uma coluna é um caso NORMAL — é o clone que segue o cursor durante o
| arrasto (`<DragOverlay><BoardCard state="overlay" …/></DragOverlay>`), que se
| desenha na raiz do documento, longe de qualquer `BoardColumnBody`. Um
| componente que tem vida fora do seu contentor tem ficheiro.
|
| O CARTÃO NÃO É NOVO: é o `Card` da casa em `variant="plain"` com o `CardBody`
| em `padding="compact"` (CONVENCOES §4-ter — não reimplementar o que já
| existe). O que esta família acrescenta é o que o quadro exige e o `Card` não
| tem: o registo de arrasto, e o arranjo interno de título + metadados que os
| dois quadros do painel escreviam à mão, iguais.
|
| DENSIDADE (REGRAS §7): um cartão de quadro é «lista de trabalho» — denso. O
| `padding="comfortable"` traz 32px de lado, que numa coluna de 210px deixa
| 146px de largura útil e nenhum dado legível. O `compact` traz 16px, o mesmo
| ritmo do `TableCell`, para uma linha de quadro e uma linha de tabela não se
| lerem com densidades diferentes na mesma aplicação.
|
| COMO O CONSUMIDOR LIGA O ARRASTO: `BoardCard` estende os props de um `<div>`,
| portanto `ref`, `style`, `attributes` e `listeners` passam intactos.
|
|   const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
|     useSortable({ id: cartao.id });
|
|   <BoardCard
|     ref={setNodeRef}
|     {...attributes}
|     {...listeners}
|     state={isDragging ? 'dragging' : 'neutral'}
|     style={{ transform: CSS.Transform.toString(transform), transition }}
|     title={cartao.titulo}
|   />
|
| O `transform` e o `transition` ficam em `style` por exigência do motor: são
| reescritos a cada frame e não podem virar classe. A opacidade e o cursor NÃO
| ficam lá — vêm do `state`, que é o que faz este componente valer a pena.
*/

const cartao = cva('', {
  variants: {
    /*
    | O registo de arrasto. `state` e não `variant` porque é o mesmo eixo que o
    | `TableRow` já chama assim: em que estado está esta linha/este cartão
    | agora. `variant` nesta casa é a superfície, e a superfície do cartão de
    | quadro é sempre a mesma.
    |
    |   neutral   parado. Cursor de agarrar, porque um cartão de quadro é uma
    |             coisa que se move — um quadro só de leitura passa
    |             `className="cursor-default"`.
    |   dragging  o ORIGINAL, enquanto o clone anda. Esbatido para se perceber
    |             de onde o cartão saiu; se desaparecesse, a coluna encolhia e
    |             o resto do quadro saltava debaixo do cursor.
    |   overlay   o CLONE que segue o cursor. Levanta-se do plano (ver abaixo).
    */
    state: {
      neutral: 'cursor-grab',
      dragging: 'cursor-grabbing opacity-40',
      overlay: 'cursor-grabbing',
    },
  },
  defaultVariants: { state: 'neutral' },
});

/*
| Tira de tom à esquerda REMOVIDA (banida — AI slop, já mandado tirar mais do
| que uma vez). O substituto é um ÍCONE com forma própria (REGRAS §11), à
| direita do título — nunca em `leading`, que já é a marca de prioridade e não
| se disputa (ver `BoardCardProps.tone` abaixo).
|
| `Severidade` (5 valores) vem de `ICONE_DE_SEVERIDADE`, fonte única do
| desenho por tom — não se duplica aqui a tabela. `tone` deste cartão tem MAIS
| dois valores que a severidade não cobre: `neutral` e `accent`. É o mesmo
| conjunto do `CalendarTone`/`StatusDot` (o vocabulário fechado da casa), não
| invenção deste ficheiro.
*/
const ROTULO_DO_TOM: Record<Severidade, string> = {
  critical: 'Crítico',
  serious: 'Grave',
  warning: 'Aviso',
  info: 'Informativo',
  good: 'Confirmado',
};

export type BoardCardTone = 'neutral' | 'accent' | Severidade;

export type BoardCardProps = Omit<React.ComponentProps<'div'>, 'title'> &
  VariantProps<typeof cartao> & {
    /**
     * O significado do cartão. Entra por ÍCONE (forma própria, nunca só cor —
     * REGRAS §11), desenhado depois do título.
     *
     * `neutral` não desenha nada — é o tom da esmagadora maioria dos cartões,
     * e um ícone em cada um enchia o quadro de ruído em vez de assinalar
     * excepção.
     *
     * `accent` também não desenha por agora: é destaque de marca, não
     * severidade, e `ICONE_DE_SEVERIDADE` não tem forma para isto.
     * TODO: falta uma entrada em `ICONES`/`ICONE_DE_SEVERIDADE` para
     * «destaque» — decisão de quem tiver a marca do ícone.
     */
    tone?: BoardCardTone;
    /** A linha que identifica o cartão. É o que se lê primeiro. */
    title: React.ReactNode;
    /**
     * Marca à esquerda do título — o símbolo de prioridade, um ícone de tipo.
     * Mesmo nome e mesmo papel do `leading` do `Button`.
     *
     * Um símbolo sozinho não é estado: vem sempre com tom E com forma
     * (REGRAS §11), e o que ele significa tem de estar escrito noutro sítio do
     * cartão ou numa legenda do quadro.
     */
    leading?: React.ReactNode;
    /**
     * Os metadados: dono, prazo, etiquetas, badge de bloqueio. Empilhados em
     * `gap-1` e alinhados por baixo do título — o `leading` ocupa a primeira
     * coluna e o que vem a seguir alinha com o texto, não com o símbolo.
     */
    children?: React.ReactNode;
  };

/**
 * Cartão de quadro kanban. `Card` + `CardBody` compacto, com registo de
 * arrasto.
 *
 * ```tsx
 * <BoardCard
 *   title="Rever a proposta"
 *   leading={<Icone de={ICONE_DE_PRIORIDADE.urgent} medida="sm" />}
 *   tone={atrasada ? 'critical' : 'neutral'}
 * >
 *   <Text size="xs" tone="muted">Ana · infra</Text>
 *   <Badge tone="warning" size="sm">à espera do cliente</Badge>
 * </BoardCard>
 * ```
 */
export function BoardCard({
  className,
  state,
  tone,
  title,
  leading,
  children,
  ...props
}: BoardCardProps) {
  /*
  | `neutral` e `accent` ficam sem ícone (ver `BoardCardProps.tone`); os
  | outros cinco vêm de `ICONE_DE_SEVERIDADE`, a fonte única do desenho por
  | tom — nada aqui redesenha ou copia essa tabela.
  */
  const DesenhoDoTom = tone && tone !== 'neutral' && tone !== 'accent' ? ICONE_DE_SEVERIDADE[tone] : null;

  return (
    /*
    | O `div` de fora leva o arrasto (ref, listeners, transform) e o `Card` de
    | dentro leva a superfície. São dois nós de propósito: o `Card` decide o
    | elemento que rende a partir do que recebe — com um `onClick` vira
    | `<button>`, e um `<button>` come o Espaço para se activar, que é a mesma
    | tecla com que o `@dnd-kit` agarra o cartão. Manter o gesto e o clique em
    | nós separados é o que deixa as duas coisas conviverem.
    */
    <div className={cn(cartao({ state }), className)} {...props}>
      <Card variant={state === 'overlay' ? 'elevated' : 'plain'}>
        <CardBody padding="compact">
          <Inline gap="xs" align="baseline">
            {leading}

            {/*
              `min-w-0 flex-1` para o título quebrar em vez de esticar a coluna:
              sem o `min-w-0`, um item de flex tem `min-width:auto` e cresce até
              caber a palavra mais comprida — e uma referência sem espaços
              rebentava a largura da coluna inteira.
            */}
            <Text size="sm" tone="strong" className="min-w-0 flex-1">
              {title}
            </Text>

            {/*
              Depois do título, nunca em `leading` — essa coluna é do símbolo
              de prioridade, e um cartão real tem as duas coisas ao mesmo
              tempo (`tone="critical"` + `leading={<Prioridade .../>}`, ver
              `apps/ds/.../quadro/page.tsx`). Sítios diferentes, sem disputa.
            */}
            {DesenhoDoTom ? (
              <Icone de={DesenhoDoTom} medida="sm" rotulo={ROTULO_DO_TOM[tone as Severidade]} />
            ) : null}
          </Inline>

          {children ? (
            <Stack gap="2xs" align="start" className={cn('mt-1', leading ? 'ml-5' : null)}>
              {children}
            </Stack>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
