import { describe, expect, it } from "vitest";
import { marcasDoAno } from "./calendario";
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
