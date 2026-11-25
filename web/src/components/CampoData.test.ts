import { describe, expect, it } from "vitest";
import { mascaraData } from "./CampoData";

describe("mascaraData", () => {
  it("põe as barras enquanto se escreve", () => {
    expect(mascaraData("25", "2")).toBe("25/");
    expect(mascaraData("25/11", "25/1")).toBe("25/11/");
    expect(mascaraData("25112026", "")).toBe("25/11/2026");
  });
  it("não volta a pôr a barra ao apagar", () => expect(mascaraData("25", "25/")).toBe("25"));
  it("completa o dia com zero", () => expect(mascaraData("1/", "1")).toBe("01/"));
  it("deixa uma data aaaa-mm-dd colada", () => expect(mascaraData("2026-11-25", "")).toBe("2026-11-25"));
});
