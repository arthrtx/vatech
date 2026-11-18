import { describe, expect, it } from "vitest";
import type { Pedido } from "./api";
import {
  celulasDoMes,
  cobreDia,
  filtrar,
  haSobreposicao,
  intervaloDoMes,
  reduzido,
  mesAnterior,
  mesSeguinte,
  tocaMes,
} from "./agenda";

const base: Pedido = {
  id: 1,
  empresa_id: 1,
  user_id: 1,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-11-27",
  data_fim: "2026-12-03",
  observacao: null,
  estado: "aprovado",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
};
const ped = (o: Partial<Pedido>): Pedido => ({ ...base, ...o });

describe("agenda", () => {
  it("pedido que atravessa meses conta nos dois", () => {
    expect(tocaMes(base, { ano: 2026, mes: 11 })).toBe(true);
    expect(tocaMes(base, { ano: 2026, mes: 12 })).toBe(true);
    expect(tocaMes(base, { ano: 2026, mes: 10 })).toBe(false);
    expect(tocaMes(base, { ano: 2027, mes: 1 })).toBe(false);
  });

  it("cobreDia inclui os dois extremos", () => {
    expect(cobreDia(base, "2026-11-27")).toBe(true);
    expect(cobreDia(base, "2026-12-03")).toBe(true);
    expect(cobreDia(base, "2026-12-04")).toBe(false);
  });

  it("sobreposicao so com pessoas diferentes", () => {
    expect(haSobreposicao([ped({ user_id: 1 }), ped({ id: 2, user_id: 2 })])).toBe(true);
    expect(haSobreposicao([ped({ user_id: 1 }), ped({ id: 2, user_id: 1 })])).toBe(false);
    expect(haSobreposicao([])).toBe(false);
  });

  it("recusados ficam de fora e filtra por tipo e funcionario", () => {
    const lista = [
      ped({ id: 1 }),
      ped({ id: 2, estado: "recusado" }),
      ped({ id: 3, tipo: "licenca", user_id: 2 }),
      ped({ id: 4, estado: "pendente", user_id: 2 }),
    ];
    expect(filtrar(lista, {}).map((p) => p.id)).toEqual([1, 3, 4]);
    expect(filtrar(lista, { tipo: "licenca" }).map((p) => p.id)).toEqual([3]);
    expect(filtrar(lista, { userId: 2 }).map((p) => p.id)).toEqual([3, 4]);
  });

  it("grelha de dezembro 2026: semanas completas de segunda a domingo", () => {
    const c = celulasDoMes({ ano: 2026, mes: 12 });
    expect(c.length % 7).toBe(0);
    expect(c[0].iso).toBe("2026-11-30"); // 1 de dezembro de 2026 e terca
    expect(c[0].doMes).toBe(false);
    expect(c.filter((x) => x.doMes)).toHaveLength(31);
  });

  it("navegacao de mes vira o ano", () => {
    expect(mesSeguinte({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 });
    expect(mesAnterior({ ano: 2026, mes: 1 })).toEqual({ ano: 2025, mes: 12 });
  });

  it("intervaloDoMes cobre o grid completo (segunda a domingo)", () => {
    expect(intervaloDoMes({ ano: 2026, mes: 12 })).toEqual({ de: "2026-11-30", ate: "2027-01-03" });
  });

  it("pedido de colega (sem user_id) conta como pessoa distinta e e reduzido", () => {
    const colega = { id: 7, user: { id: 2, nome: "Rui" }, tipo: "ferias", data_inicio: "2026-12-01", data_fim: "2026-12-02", estado: "aprovado" } as const;
    expect(reduzido(colega)).toBe(true);
    expect(reduzido(ped({}))).toBe(false);
    expect(haSobreposicao([ped({ user_id: 1, user: { id: 1, nome: "Ana" } }), colega])).toBe(true);
    expect(haSobreposicao([colega, { ...colega, id: 8 }])).toBe(false);
    expect(filtrar([colega], { userId: 2 }).length).toBe(1);
  });
});
