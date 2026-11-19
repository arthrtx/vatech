import { describe, expect, it } from "vitest";
import type { Pedido, PedidoAgenda } from "./api";
import { aplicarFiltrosAgenda, aplicarFiltrosPedidos, contarAtivos, filtrosVazios } from "./filtros";

const p = (id: number, o: Partial<Pedido>): Pedido => ({
  id,
  empresa_id: 1,
  user_id: 1,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-12-10",
  data_fim: "2026-12-15",
  observacao: null,
  estado: "pendente",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  ...o,
});
const lista = [
  p(1, {}),
  p(2, { estado: "aprovado", tipo: "licenca", user_id: 2 }),
  p(3, { estado: "recusado", data_inicio: "2027-01-05", data_fim: "2027-01-16", user_id: 2 }),
];
const ids = (l: { id: number }[]) => l.map((x) => x.id);

describe("aplicarFiltrosPedidos", () => {
  it("vazio devolve tudo", () => expect(ids(aplicarFiltrosPedidos(lista, filtrosVazios))).toEqual([1, 2, 3]));
  it("OR dentro do grupo, AND entre grupos", () => {
    expect(ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, estados: ["pendente", "aprovado"] }))).toEqual([1, 2]);
    expect(
      ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, estados: ["pendente", "aprovado"], tipos: ["licenca"] })),
    ).toEqual([2]);
  });
  it("funcionario", () =>
    expect(ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, funcionarioId: 2 }))).toEqual([2, 3]));
  it("periodo: sobreposicao e limites abertos", () => {
    expect(ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, de: "2026-12-15", ate: "2026-12-20" }))).toEqual([1, 2]);
    expect(ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, de: "2026-12-16", ate: "2026-12-31" }))).toEqual([]);
    expect(ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, de: "2027-01-01" }))).toEqual([3]);
    expect(ids(aplicarFiltrosPedidos(lista, { ...filtrosVazios, ate: "2026-12-10" }))).toEqual([1, 2]);
  });
});

describe("aplicarFiltrosAgenda", () => {
  const ag: PedidoAgenda[] = [
    { id: 1, user: { id: 5, nome: "A" }, tipo: "ferias", data_inicio: "2026-12-01", data_fim: "2026-12-02", estado: "pendente" },
    { id: 2, user: { id: 6, nome: "B" }, tipo: "ausencia", data_inicio: "2026-12-01", data_fim: "2026-12-02", estado: "aprovado", user_id: 6 },
  ];
  it("combina tipos, estados e funcionario", () => {
    expect(ids(aplicarFiltrosAgenda(ag, { tipos: [], estados: [], funcionarioId: null }))).toEqual([1, 2]);
    expect(ids(aplicarFiltrosAgenda(ag, { tipos: [], estados: ["aprovado"], funcionarioId: null }))).toEqual([2]);
    expect(ids(aplicarFiltrosAgenda(ag, { tipos: ["ferias"], estados: [], funcionarioId: 5 }))).toEqual([1]);
  });
});

describe("contarAtivos", () => {
  it("conta grupos, periodo = 1", () => {
    expect(contarAtivos(filtrosVazios)).toBe(0);
    expect(
      contarAtivos({ ...filtrosVazios, estados: ["pendente", "aprovado"], de: "2026-12-01", ate: "2026-12-31", funcionarioId: 1 }),
    ).toBe(3);
    expect(contarAtivos({ tipos: ["ferias"], estados: ["aprovado"], funcionarioId: null })).toBe(2);
  });
});
