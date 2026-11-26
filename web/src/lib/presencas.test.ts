import { describe, expect, it } from "vitest";
import type { Presenca } from "./api";
import { agruparPorDia, duracaoTexto, minutosPeriodo, textoPeriodo, totalHoras, totalMinutos } from "./presencas";

describe("totalHoras", () => {
  const p = { entrada: "2026-11-23T09:00:00Z", saida: "2026-11-23T18:00:00Z" };

  it("conta de entrada a saída", () => expect(totalHoras(p)).toBe("9 h 00 min"));
  it("tira o almoço", () => expect(totalHoras({ ...p, almoco_min: 60 })).toBe("8 h 00 min"));
  it("fica vazio sem saída", () => expect(totalHoras({ ...p, saida: null })).toBe(""));
});

const per = (id: number, user_id: number, data: string, e: string, s: string | null, almoco_min = 0) =>
  ({ id, user_id, user: { id: user_id, nome: user_id === 1 ? "Ana" : "Bruno" }, data, entrada: `${data}T${e}:00Z`, saida: s ? `${data}T${s}:00Z` : null, atrasada: false, almoco_min }) as Presenca;

describe("períodos e agrupamento", () => {
  it("duração e texto do período", () => {
    expect(minutosPeriodo(per(1, 1, "2026-11-23", "08:00", "12:00"))).toBe(240);
    expect(minutosPeriodo(per(1, 1, "2026-11-23", "08:00", null))).toBeNull();
    expect(duracaoTexto(270)).toBe("4 h 30 min");
    expect(textoPeriodo(per(1, 1, "2026-11-23", "14:00", null))).toMatch(/· em curso$/);
    expect(textoPeriodo(per(1, 1, "2026-11-23", "08:00", "12:00"))).toMatch(/ às .* · 4 h 00 min$/);
  });

  it("totalMinutos soma fechados, desconta almoço e ignora o em curso", () => {
    const ps = [per(1, 1, "2026-11-23", "08:00", "13:00", 60), per(2, 1, "2026-11-23", "14:00", "16:00"), per(3, 1, "2026-11-23", "17:00", null)];
    expect(totalMinutos(ps)).toBe(240 + 120);
  });

  it("agrupa vários períodos do mesmo dia e pessoa numa só linha", () => {
    const g = agruparPorDia([
      per(3, 1, "2026-11-23", "14:00", "16:00"),
      per(1, 1, "2026-11-23", "08:00", "12:00"),
      per(4, 2, "2026-11-23", "09:00", null),
      per(5, 1, "2026-11-24", "09:00", "10:00"),
    ]);
    expect(g.map((x) => [x.data, x.user?.nome, x.periodos.length])).toEqual([
      ["2026-11-24", "Ana", 1],
      ["2026-11-23", "Ana", 2],
      ["2026-11-23", "Bruno", 1],
    ]);
    expect(g[1].periodos.map((p) => p.id)).toEqual([1, 3]);
    expect(g[1].minutos).toBe(360);
    expect(g[2].emCurso).toBe(true);
  });
});
