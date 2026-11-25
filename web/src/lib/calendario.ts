import type { Aniversario, PedidoAgenda } from "./api";
import { somaDias, visiveis } from "./agenda";
import type { DataEspecial } from "./feriados";

/** Tudo o que marca um dia no calendário anual. */
export interface MarcasDoDia {
  datas: DataEspecial[];
  aniversarios: string[];
  pedidos: PedidoAgenda[];
}

/** Agrupa por dia (só dentro do ano) feriados/pontes, aniversários e pedidos ativos. */
export function marcasDoAno(
  ano: number,
  datas: DataEspecial[],
  aniversarios: Aniversario[],
  pedidos: PedidoAgenda[],
): Map<string, MarcasDoDia> {
  const mapa = new Map<string, MarcasDoDia>();
  const dia = (iso: string) => {
    let m = mapa.get(iso);
    if (!m) mapa.set(iso, (m = { datas: [], aniversarios: [], pedidos: [] }));
    return m;
  };
  const noAno = (iso: string) => Number(iso.slice(0, 4)) === ano;

  datas.filter((d) => noAno(d.iso)).forEach((d) => dia(d.iso).datas.push(d));
  aniversarios.filter((a) => noAno(a.data)).forEach((a) => dia(a.data).aniversarios.push(a.user.nome));
  visiveis(pedidos).forEach((p) => {
    const inicio = p.data_inicio < `${ano}-01-01` ? `${ano}-01-01` : p.data_inicio;
    const fim = p.data_fim > `${ano}-12-31` ? `${ano}-12-31` : p.data_fim;
    for (let iso = inicio; iso <= fim; iso = somaDias(iso, 1)) dia(iso).pedidos.push(p);
  });
  return mapa;
}
