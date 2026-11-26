import { diasDoPedido } from "@/lib/agenda";
import type { PedidoAgenda } from "@/lib/api";
import { dataPt } from "@/lib/presencas";
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
    <ul className="flex flex-col divide-y divide-line">
      {pedidos.map((p) => {
        const datas = p.data_inicio === p.data_fim ? dataPt(p.data_inicio) : `${dataPt(p.data_inicio)} a ${dataPt(p.data_fim)}`;
        const partes = titulo === "nome" ? [tipos[p.tipo], datas] : [datas];
        if (comDias) partes.push(dias(diasDoPedido(p)));
        return (
          <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-pill bg-good" />
            <div className="min-w-0">
              <p className="text-sm font-semibold break-words text-text-1">{titulo === "nome" ? (p.user?.nome ?? "Colega") : tipos[p.tipo]}</p>
              <p className="ds-tabular text-sm text-text-2">{partes.join(" · ")}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
