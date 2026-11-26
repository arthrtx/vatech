/*
| Barril da família `board` — o quadro kanban: a faixa, a coluna, a zona que
| recebe o cartão, e o cartão.
|
| Explícito por nome e nunca `export *`: as `cva` deste ficheiro (`corpo`,
| `cartao`, `tira`) são detalhe de implementação e com `export *` viravam API
| pública sem ninguém o decidir — a partir daí não se mudavam sem partir quem
| as tivesse importado.
|
| O motor de arrasto NÃO está aqui e não vem no pacote: esta família dá a
| forma, e o `@dnd-kit` (ou outro) é do consumidor. Ver o cabeçalho de
| `Board.tsx`.
*/

export { Board, BoardColumn, BoardColumnBody, BoardColumnEmpty } from './Board';
export type {
  BoardProps,
  BoardColumnProps,
  BoardColumnBodyProps,
  BoardColumnEmptyProps,
} from './Board';

export { BoardCard } from './BoardCard';
export type { BoardCardProps } from './BoardCard';
