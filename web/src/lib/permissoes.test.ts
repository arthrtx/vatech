import { describe, expect, it } from "vitest";
import { podePedir, temPermissao } from "./permissoes";

describe("temPermissao", () => {
  it("o admin tem sempre tudo, mesmo sem lista", () => {
    expect(temPermissao({ papel: "admin" }, "gerir_pontes")).toBe(true);
  });
  it("os outros só têm o que está na lista", () => {
    const u = { papel: "funcionario" as const, permissoes: ["pedir_ferias"] };
    expect(temPermissao(u, "pedir_ferias")).toBe(true);
    expect(temPermissao(u, "aprovar_pedidos")).toBe(false);
  });
  it("sem lista (resposta antiga) ou sem utilizador, nega", () => {
    expect(temPermissao({ papel: "estagiario" }, "pedir_ferias")).toBe(false);
    expect(temPermissao(null, "pedir_ferias")).toBe(false);
  });
});

describe("podePedir", () => {
  it("precisa de pelo menos um tipo de pedido", () => {
    expect(podePedir({ papel: "funcionario", permissoes: ["pedir_licenca"] })).toBe(true);
    expect(podePedir({ papel: "funcionario", permissoes: ["marcar_presenca"] })).toBe(false);
  });
});
