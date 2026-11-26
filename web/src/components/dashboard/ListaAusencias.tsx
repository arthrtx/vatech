import { diasDoPedido } from "@/lib/agenda";
import type { PedidoAgenda } from "@/lib/api";
import { tipos } from "@/lib/rotulos";

interface Props {
  pedidos: PedidoAgenda[];
  /** "nome": nome como titulo (equipa/admin). "tipo": tipo como titulo (as minhas ausencias). */
  titulo: "nome" | "tipo";
  /** Mostra tambem "N dias" na linha de detalhe. */
  comDias?: boolean;
}

const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

/** D7: so nome, tipo e datas; nunca subtipo nem observacao. */
export default function ListaAusencias({ pedidos, titulo, comDias = false }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {pedidos.map((p) => {
        const datas = p.data_inicio === p.data_fim ? p.data_inicio : `${p.data_inicio} a ${p.data_fim}`;
        const partes = titulo === "nome" ? [tipos[p.tipo], datas] : [datas];
        if (comDias) partes.push(dias(diasDoPedido(p)));
        return (
          <li key={p.id} className="flex items-center gap-3 rounded-cartao bg-campo px-4 py-3">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full bg-positivo" />
            <div className="min-w-0">
              <p className="font-semibold [overflow-wrap:anywhere]">{titulo === "nome" ? (p.user?.nome ?? "Colega") : tipos[p.tipo]}</p>
              <p className="text-sm text-texto-suave">{partes.join(" · ")}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
