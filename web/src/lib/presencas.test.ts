import { describe, expect, it } from "vitest";
import { totalHoras } from "./presencas";

describe("totalHoras", () => {
  const p = { entrada: "2026-11-23T09:00:00Z", saida: "2026-11-23T18:00:00Z" };

  it("conta de entrada a saída", () => expect(totalHoras(p)).toBe("9 h 00 min"));
  it("tira o almoço", () => expect(totalHoras({ ...p, almoco_min: 60 })).toBe("8 h 00 min"));
  it("fica vazio sem saída", () => expect(totalHoras({ ...p, saida: null })).toBe(""));
});
