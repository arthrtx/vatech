import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from "./api";

const user = { id: 1, nome: "A", email: "a@b.c", papel: "admin", empresa_id: 1 };

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });
}

describe("cliente da API", () => {
  beforeEach(() => setToken(null));
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it("login guarda o token e envia o corpo", async () => {
    const f = vi.fn().mockResolvedValue(resposta(200, { token: "t123", user }));
    vi.stubGlobal("fetch", f);
    const u = await api.login("a@b.c", "x");
    expect(u.nome).toBe("A");
    expect(getToken()).toBe("t123");
    expect(f.mock.calls[0][0]).toMatch(/\/login$/);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ email: "a@b.c", password: "x" });
  });

  it("envia Bearer nos pedidos autenticados", async () => {
    setToken("abc");
    const f = vi.fn().mockResolvedValue(resposta(200, { data: [] }));
    vi.stubGlobal("fetch", f);
    await api.pedidos("pendente");
    expect(f.mock.calls[0][0]).toMatch(/\/pedidos\?estado=pendente$/);
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer abc");
  });

  it("401 limpa o token e chama o handler", async () => {
    setToken("abc");
    const h = vi.fn();
    setUnauthorizedHandler(h);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { message: "Não autenticado." })));
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    expect(h).toHaveBeenCalledOnce();
    expect(getToken()).toBeNull();
  });

  it("erro 422 expoe os erros de validacao", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(resposta(422, { message: "m", errors: { email: ["invalido"] } })),
    );
    await expect(api.login("x", "y")).rejects.toMatchObject({
      status: 422,
      errors: { email: ["invalido"] },
    });
  });

  it("agenda pede GET /agenda com de e ate e devolve data", async () => {
    setToken("abc");
    const lista = [{ id: 5, user: { id: 2, nome: "Rui" }, tipo: "ferias", data_inicio: "2026-12-01", data_fim: "2026-12-02", estado: "aprovado" }];
    const f = vi.fn().mockResolvedValue(resposta(200, { data: lista }));
    vi.stubGlobal("fetch", f);
    expect(await api.agenda("2026-11-30", "2027-01-03")).toEqual(lista);
    expect(f.mock.calls[0][0]).toMatch(/\/agenda\?de=2026-11-30&ate=2027-01-03$/);
    expect(f.mock.calls[0][1].method).toBe("GET");
  });
});
