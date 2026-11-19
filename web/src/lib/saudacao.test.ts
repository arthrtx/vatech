import { describe, expect, it } from "vitest";
import { primeiroNome, saudacao } from "./saudacao";

const as = (h: number, m = 0) => new Date(2026, 10, 19, h, m);

describe("saudacao", () => {
  it("muda nas fronteiras 12h e 19h", () => {
    expect(saudacao(as(0))).toBe("Bom dia");
    expect(saudacao(as(11, 59))).toBe("Bom dia");
    expect(saudacao(as(12))).toBe("Boa tarde");
    expect(saudacao(as(18, 59))).toBe("Boa tarde");
    expect(saudacao(as(19))).toBe("Boa noite");
    expect(saudacao(as(23, 59))).toBe("Boa noite");
  });
  it("primeiro nome", () => {
    expect(primeiroNome("  Admin Demo ")).toBe("Admin");
  });
});
