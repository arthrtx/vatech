/*
| Barril da família `calendar` — o mês, o eixo de tempo, e os tipos que os dois
| partilham.
|
| Explícito por nome e nunca `export *`: `internals.tsx` tem aritmética de datas
| e mapas de classes que são detalhe de implementação. Com `export *`, um
| `adicionarMeses` passava a API pública do design system sem ninguém o decidir,
| e a partir daí não se podia mudar sem partir quem o importou.
*/

export {
  Calendar,
  type CalendarProps,
  type CalendarRange,
  type CalendarSelectionMode,
} from './Calendar';
export { AgendaGrid, type AgendaGridProps } from './AgendaGrid';

export type { CalendarEvent, CalendarTone, CalendarWeekDay } from './internals';
