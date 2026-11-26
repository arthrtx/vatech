import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Icone, ICONES } from '../icons';

/*
| Métrica única: rótulo, valor grande e variação.
|
| O `variant` trata a superfície E o espaço interior, porque as duas coisas
| são a mesma decisão: quem traz superfície própria tem de trazer o padding
| que a torna respirável, e quem cai dentro de uma superfície alheia tem de
| saber se essa superfície já paga o padding.
|
| Sem o terceiro valor, um `Stat` dentro de um `CardBody` somava 32px do
| corpo do cartão aos 24px próprios — 56px de moldura à volta de um número.
| A migração da primeira página do painel bateu exactamente aí e resolveu-o
| com `className="p-0"`, que é anular uma decisão do sistema por fora.
*/
const metrica = cva('', {
  variants: {
    variant: {
      /** Dentro de uma superfície que ainda não tem padding — a célula de um `StatGroup`. */
      plain: 'p-6',
      /** Sozinha na página: traz a sua própria superfície. */
      card: 'rounded-lg border border-line bg-surface-1 p-6',
      /** Dentro de um contentor que já paga superfície **e** padding — `CardBody`, célula de tabela. */
      bare: '',
    },
  },
  defaultVariants: { variant: 'plain' },
});

/** Sentido da variação. É a seta; o tom é decidido à parte. */
export type StatDirection = 'up' | 'down' | 'flat';

/** Leitura da variação. Separado do sentido porque subir nem sempre é bom. */
export type StatTone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

const variacao = cva('inline-flex items-center gap-1 text-sm font-semibold', {
  variants: {
    tone: {
      good: 'text-good-ink',
      warning: 'text-warning-ink',
      serious: 'text-serious-ink',
      critical: 'text-critical-ink',
      neutral: 'text-text-2',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type StatProps = React.ComponentProps<'div'> &
  VariantProps<typeof metrica> & {
    /** O que a métrica mede. Vai por cima do valor — contexto antes do número. */
    label: React.ReactNode;
    /** O número já formatado. A formatação é do domínio (moeda, locale), não do componente. */
    value: React.ReactNode;
    /** Variação face ao período anterior, já com sinal: "+12,4%", "-3 dias". */
    change?: React.ReactNode;
    /** Sentido da variação — desenha a seta. */
    changeDirection?: StatDirection;
    /**
     * Leitura da variação. Por omissão sobe = bom, desce = mau; num indicador
     * de custo ou de latência é ao contrário e tem de vir explícito.
     */
    changeTone?: StatTone;
    /** Frase curta que enquadra a variação: "face ao mês anterior". */
    hint?: React.ReactNode;
  };

export function Stat({
  className,
  variant,
  label,
  value,
  change,
  changeDirection = 'flat',
  changeTone,
  hint,
  ...props
}: StatProps) {
  const tom: StatTone =
    changeTone ?? (changeDirection === 'up' ? 'good' : changeDirection === 'down' ? 'critical' : 'neutral');

  return (
    <div className={cn(metrica({ variant }), className)} {...props}>
      <p className="ds-eyebrow">{label}</p>
      {/* `ds-tabular` para que uma faixa de métricas alinhe os dígitos entre cartões. */}
      <p className="ds-tabular mt-2 text-h4 leading-tight font-bold text-text-1">{value}</p>

      {change ? (
        <p className={cn(variacao({ tone: tom }), 'mt-2')}>
          {/*
            | A seta não é decoração: sem ela, uma variação distingue-se da
            | outra só pela cor — e cerca de 8% dos homens não faz essa
            | distinção. O sinal no texto ("+12%") é a terceira via.
          */}
          <Icone
            de={
              changeDirection === 'up'
                ? ICONES.paraCima
                : changeDirection === 'down'
                  ? ICONES.paraBaixo
                  : ICONES.traco
            }
            medida="sm"
          />
          <span className="ds-tabular">{change}</span>
          <span className="ds-sr-only">
            {changeDirection === 'up' ? 'a subir' : changeDirection === 'down' ? 'a descer' : 'sem variação'}
          </span>
          {/*
            | O `hint` fica em `text-3` porque está MEDIDO, não presumido — e
            | não se volta a trocar por `text-2` sem medir outra vez. Com o
            | valor actual de `--ds-text-3` em `contract.css`, o par dá
            | 5.92:1 sobre `surface-1`, 5.62:1 sobre `plane`, 5.37:1 sobre
            | `surface-2` e 4.86:1 sobre `surface-3`; no tema escuro,
            | 6.18 / 6.90 / 5.59 / 4.97. Passa 4.5:1 nas quatro superfícies
            | dos dois temas.
            |
            | O 3.59:1 que ainda circula na documentação é do valor ANTIGO do
            | token, já substituído. Ver a nota em `src/contract.css`.
          */}
          {hint ? <span className="font-normal text-text-3">{hint}</span> : null}
        </p>
      ) : hint ? (
        <p className="mt-2 text-sm text-text-3">{hint}</p>
      ) : null}
    </div>
  );
}
