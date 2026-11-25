import type { Aniversario, PedidoAgenda, TipoPedido } from "./api";
import { somaDias, visiveis } from "./agenda";
import type { DataEspecial, PonteDia } from "./feriados";

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

/** Faixa horizontal de uma semana: um pedido (férias, ausência, licença) ou uma ponte, de um dia ao outro. */
export interface Barra {
  chave: string;
  /** Colunas 0 a 6 (segunda a domingo), inclusive. */
  de: number;
  ate: number;
  /** Linha da faixa, a partir de 0 (pontes primeiro). */
  faixa: number;
  tipo: "ponte" | TipoPedido;
  pendente: boolean;
  texto: string;
  /** A faixa começa/acaba mesmo neste dia (senão continua na semana anterior/seguinte). */
  abreAqui: boolean;
  fechaAqui: boolean;
}

/** Faixas de uma semana de 7 dias (ISO, segunda primeiro): quem está fora e pontes, arrumadas em linhas sem se sobrepor. */
export function barrasDaSemana(semana: string[], pedidos: PedidoAgenda[], pontes: PonteDia[]): Barra[] {
  const [ini, fim] = [semana[0], semana[6]];
  const col = (iso: string) => semana.indexOf(iso);
  const corta = (a: string, b: string) => ({
    de: a < ini ? 0 : col(a),
    ate: b > fim ? 6 : col(b),
    abreAqui: a >= ini,
    fechaAqui: b <= fim,
  });
  const brutas: Omit<Barra, "faixa">[] = [
    ...pontes
      .filter((p) => p.data_inicio <= fim && p.data_fim >= ini)
      .map((p) => ({ chave: `ponte-${p.nome}-${p.data_inicio}`, tipo: "ponte" as const, pendente: false, texto: p.nome, ...corta(p.data_inicio, p.data_fim) })),
    ...visiveis(pedidos)
      .filter((p) => p.data_inicio <= fim && p.data_fim >= ini)
      .map((p) => ({
        chave: `pedido-${p.id}`,
        tipo: p.tipo,
        pendente: p.estado === "pendente",
        texto: p.user?.nome ?? "Alguém",
        ...corta(p.data_inicio, p.data_fim),
      })),
  ];
  brutas.sort((a, b) => (a.tipo === "ponte" ? 0 : 1) - (b.tipo === "ponte" ? 0 : 1) || a.de - b.de || b.ate - a.ate);
  const ocupado: number[] = []; // última coluna ocupada em cada faixa
  return brutas.map((b) => {
    let faixa = ocupado.findIndex((ate) => ate < b.de);
    if (faixa === -1) faixa = ocupado.length;
    ocupado[faixa] = b.ate;
    return { ...b, faixa };
  });
}
