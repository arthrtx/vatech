import { describe, expect, it } from "vitest";
import { barrasDaSemana, marcasDoAno } from "./calendario";
import type { PedidoAgenda } from "./api";

const pedido = (o: Partial<PedidoAgenda>): PedidoAgenda => ({
  id: 1,
  tipo: "ferias",
  data_inicio: "2026-08-03",
  data_fim: "2026-08-05",
  estado: "aprovado",
  user: { id: 1, nome: "Ana" },
  ...o,
});

describe("marcasDoAno", () => {
  it("espalha o pedido por todos os dias, inclusive os limites", () => {
    const m = marcasDoAno(2026, [], [], [pedido({})]);
    expect(["2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"].map((d) => m.get(d)?.pedidos.length ?? 0)).toEqual([0, 1, 1, 1, 0]);
  });

  it("corta pedidos que atravessam o ano", () => {
    const m = marcasDoAno(2026, [], [], [pedido({ data_inicio: "2025-12-30", data_fim: "2026-01-02" })]);
    expect([...m.keys()].sort()).toEqual(["2026-01-01", "2026-01-02"]);
  });

  it("ignora recusados e cancelados", () => {
    const m = marcasDoAno(2026, [], [], [pedido({ estado: "recusado" }), pedido({ id: 2, estado: "cancelado" })]);
    expect(m.size).toBe(0);
  });

  it("junta feriados e aniversários só do ano pedido", () => {
    const m = marcasDoAno(
      2026,
      [
        { iso: "2026-12-25", nome: "Natal", tipo: "feriado" },
        { iso: "2027-01-01", nome: "Ano Novo", tipo: "feriado" },
      ],
      [{ user: { id: 1, nome: "Ana" }, data: "2026-12-25" }],
      [],
    );
    expect(m.get("2026-12-25")).toMatchObject({ datas: [{ nome: "Natal" }], aniversarios: ["Ana"] });
    expect(m.has("2027-01-01")).toBe(false);
  });
});

describe("barrasDaSemana", () => {
  // Semana de segunda 3 a domingo 9 de agosto de 2026.
  const semana = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];

  it("estica a faixa do primeiro ao último dia do pedido", () => {
    const [b] = barrasDaSemana(semana, [pedido({})], []);
    expect(b).toMatchObject({ de: 0, ate: 2, faixa: 0, abreAqui: true, fechaAqui: true, texto: "Ana" });
  });

  it("corta nas pontas da semana e marca que continua", () => {
    const [b] = barrasDaSemana(semana, [pedido({ data_inicio: "2026-07-30", data_fim: "2026-08-12" })], []);
    expect(b).toMatchObject({ de: 0, ate: 6, abreAqui: false, fechaAqui: false });
  });

  it("põe a ponte na primeira faixa e reaproveita a faixa quando não há sobreposição", () => {
    const bs = barrasDaSemana(
      semana,
      [pedido({}), pedido({ id: 2, user: { id: 2, nome: "Rui" }, data_inicio: "2026-08-05", data_fim: "2026-08-06" }), pedido({ id: 3, user: { id: 3, nome: "Eva" }, data_inicio: "2026-08-07", data_fim: "2026-08-07" })],
      [{ nome: "Ponte", data_inicio: "2026-08-03", data_fim: "2026-08-04" }],
    );
    expect(bs.map((b) => [b.texto, b.faixa])).toEqual([["Ponte", 0], ["Ana", 1], ["Rui", 0], ["Eva", 0]]);
  });

  it("ignora pedidos de fora da semana e os recusados", () => {
    expect(barrasDaSemana(semana, [pedido({ data_inicio: "2026-09-01", data_fim: "2026-09-02" }), pedido({ id: 2, estado: "recusado" })], [])).toEqual([]);
  });
});
