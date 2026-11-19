import { describe, expect, it } from "vitest";
import { diasUteis } from "./diasUteis";

describe("diasUteis", () => {
  it("conta seg-sex inclusivo", () => {
    expect(diasUteis("2026-03-02", "2026-03-06")).toBe(5);
    expect(diasUteis("2026-03-02", "2026-03-08")).toBe(5);
    expect(diasUteis("2026-03-07", "2026-03-08")).toBe(0);
    expect(diasUteis("2026-03-04", "2026-03-04")).toBe(1);
  });
  it("exclui feriados nacionais mas não municipais", () => {
    expect(diasUteis("2026-04-25", "2026-04-28")).toBe(2); // 25 sáb, 26 dom
    expect(diasUteis("2026-04-01", "2026-04-07")).toBe(4); // 3 abr sexta santa, 5 páscoa
    expect(diasUteis("2026-06-10", "2026-06-10")).toBe(0);
    expect(diasUteis("2026-06-24", "2026-06-24")).toBe(1); // São João (municipal) conta
  });
  it("atravessa anos", () => {
    expect(diasUteis("2026-12-30", "2027-01-04")).toBe(3); // 30,31 qua/qui; 1 jan feriado; 4 seg
  });
});
