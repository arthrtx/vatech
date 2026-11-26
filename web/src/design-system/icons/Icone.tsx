import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

/*
| A moldura de um ícone. É o único sítio que sabe quanto mede e como se pinta.
|
| Antes desta pasta, um ícone era um glifo unicode escrito à mão dentro do JSX
| (`'◇'`, `'▲'`, `'●'`). Isso tem três defeitos que só se vêem juntos: o glifo
| herda a métrica da FONTE, portanto muda de tamanho e de linha de base conforme
| o peso do texto à volta; não há nenhum sítio onde esteja escrito o que cada um
| significa, logo o mesmo `●` acabou a servir «crítico», «activo» e «há
| notificações»; e o leitor de ecrã lê-o — «círculo preto» — no meio da frase.
|
| Aqui o desenho vem do `lucide-react`, o tamanho vem da escala do sistema e a
| cor vem do `currentColor`, isto é, da tinta de quem o embrulha. Quem quer um
| ícone crítico a vermelho põe `text-critical-ink` no PAI, como já fazia com o
| glifo — o ícone não conhece cor nenhuma.
*/

/*
| Os degraus são os que os SVG do sistema já usavam (`size-3`, `size-4`,
| `size-5`), não uma escala nova: `md` é 16px porque era o que 16 dos SVG
| existentes tinham. O `xl` serve o estado vazio, onde o ícone é a peça e não a
| companhia de uma palavra.
*/
const MEDIDAS = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-8',
} as const;

export type MedidaDeIcone = keyof typeof MEDIDAS;

export type IconeProps = {
  /** O desenho. Vem sempre de `ICONES`, nunca de um import solto do lucide. */
  de: LucideIcon;
  medida?: MedidaDeIcone;
  /**
   * O que o ícone diz, para quem não o vê.
   *
   * **Omitir é o caso normal**, e é o correcto quando ao lado há texto que diz
   * a mesma coisa — um ícone de alerta ao lado da palavra «Alertas» lido em voz
   * alta dá «alerta alertas». Sem rótulo o ícone é `aria-hidden` e desaparece
   * da leitura, que é o que se quer.
   *
   * **Preencher só quando o ícone é a ÚNICA coisa que carrega o significado**:
   * a bolinha de estado numa tabela sem coluna de texto, o botão que é só um X.
   * Aí passa a `<title>` e a `role="img"`, e é lido.
   */
  rotulo?: string;
  className?: string;
};

export function Icone({ de: Desenho, medida = 'md', rotulo, className }: IconeProps) {
  return (
    <Desenho
      className={cn(MEDIDAS[medida], 'shrink-0', className)}
      /*
        `shrink-0` porque um ícone dentro de um flex com texto comprido encolhe
        até ao oval — foi assim que o `●` da barra de topo se deformou.

        `absoluteStrokeWidth` mantém o traço com a mesma espessura ÓPTICA em
        todos os degraus. Sem ele, o lucide escala o traço com a caixa e o ícone
        de 12px fica com um traço mais fino que o de 20px — em cima de uma
        tabela densa, lê-se como duas famílias diferentes.
      */
      absoluteStrokeWidth
      strokeWidth={1.75}
      aria-hidden={rotulo ? undefined : true}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
    />
  );
}
