import { describe, expect, it } from "vitest";
import { filtrar, normalizar } from "./busca";

const itens = [
  { nome: "João Álvares", email: "joao@x.pt" },
  { nome: "Ana", email: "ana@y.pt" },
  { nome: "Rui", email: null },
];
const campos = (i: { nome: string; email: string | null }) => [i.nome, i.email];

describe("normalizar", () => {
  it("minúsculas, sem acentos, sem espaços nas pontas", () => {
    expect(normalizar("  ÁLVARES ção ")).toBe("alvares cao");
  });
});

describe("filtrar", () => {
  it("query vazia ou só espaços devolve tudo", () => {
    expect(filtrar(itens, "", campos)).toHaveLength(3);
    expect(filtrar(itens, "   ", campos)).toHaveLength(3);
  });
  it("ignora acentos e maiúsculas", () => {
    expect(filtrar(itens, "JOAO", campos).map((i) => i.nome)).toEqual(["João Álvares"]);
    expect(filtrar(itens, "álvares", campos)).toHaveLength(1);
  });
  it("casa por qualquer campo e tolera nulos", () => {
    expect(filtrar(itens, "y.pt", campos).map((i) => i.nome)).toEqual(["Ana"]);
    expect(filtrar(itens, "rui", campos)).toHaveLength(1);
  });
  it("sem correspondência devolve vazio", () => {
    expect(filtrar(itens, "zzz", campos)).toEqual([]);
  });
});
