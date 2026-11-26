/*
| Barril da família `layout` — a estrutura da página e as superfícies onde o
| conteúdo assenta.
|
| Ordem de leitura: primeiro o que enquadra a página (Container, Section,
| PageHeader), depois as superfícies (Card, Panel), depois o arranjo interno
| (Stack, Inline, Grid, Split, Divider) e por fim o conteúdo (Prose,
| AspectRatio).
*/

export { Container, type ContainerProps } from './Container';
export { Section, type SectionProps } from './Section';
export { PageHeader, type PageHeaderProps } from './PageHeader';

export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  type CardProps,
  type CardHeaderProps,
  type CardBodyProps,
  type CardFooterProps,
} from './Card';
export { Panel, type PanelProps } from './Panel';

export { Stack, type StackProps } from './Stack';
export { Inline, type InlineProps } from './Inline';
export { Grid, type GridProps } from './Grid';
export { Split, type SplitProps } from './Split';
export { Divider, type DividerProps } from './Divider';

export { Prose, type ProseProps } from './Prose';
export { AspectRatio, type AspectRatioProps } from './AspectRatio';
