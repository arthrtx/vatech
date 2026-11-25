import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { ApiError, api } from "@/lib/api";

const replace = vi.fn();
const login = vi.fn();
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null, loading: false, login }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { reenviarConfirmacao: vi.fn() } };
});

beforeEach(() => {
  query = "";
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const entrar = () => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@x.pt" } });
  fireEvent.change(screen.getByLabelText("Palavra-passe"), { target: { value: "segredo123" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
};

const porConfirmar = () =>
  new ApiError(422, "invalid", { email: ["Confirme o seu email para entrar. Enviámos-lhe um link; se não o encontra, peça um novo."] });

describe("Login", () => {
  it("não mostra avisos nem Reenviar link por omissão e liga a Criar conta", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reenviar link" })).toBeNull();
    expect(screen.getByRole("link", { name: "Criar conta" }).getAttribute("href")).toBe("/registo");
  });

  it("?verificado=1 mostra o aviso de email confirmado", () => {
    query = "verificado=1";
    render(<LoginPage />);
    expect(screen.getByRole("status").textContent).toBe("Email confirmado. Já pode entrar.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("?verificado=0 mostra o aviso de link inválido ou expirado", () => {
    query = "verificado=0";
    render(<LoginPage />);
    expect(screen.getByRole("alert").textContent).toBe("Link inválido ou expirado.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("credenciais inválidas (422 sem 'confirme') mostram o erro mas não o botão Reenviar link", async () => {
    login.mockRejectedValue(new ApiError(422, "invalid", { email: ["Credenciais inválidas."] }));
    render(<LoginPage />);
    entrar();
    expect((await screen.findByRole("alert")).textContent).toBe("Credenciais inválidas.");
    expect(screen.queryByRole("button", { name: "Reenviar link" })).toBeNull();
  });

  it("422 de email por confirmar mostra Reenviar link; ao clicar reenvia e mostra o aviso", async () => {
    login.mockRejectedValue(porConfirmar());
    vi.mocked(api.reenviarConfirmacao).mockResolvedValue("ok");
    render(<LoginPage />);
    entrar();
    fireEvent.click(await screen.findByRole("button", { name: "Reenviar link" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/novo link de confirmação/));
    expect(api.reenviarConfirmacao).toHaveBeenCalledWith("ana@x.pt");
    expect(screen.queryByRole("button", { name: "Reenviar link" })).toBeNull();
  });

  it("a mesma mensagem com outro estado HTTP não mostra Reenviar link", async () => {
    login.mockRejectedValue(new ApiError(500, "Confirme isto", undefined));
    render(<LoginPage />);
    entrar();
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Reenviar link" })).toBeNull();
  });

  it("login com sucesso vai para a página inicial", async () => {
    login.mockResolvedValue(undefined);
    render(<LoginPage />);
    entrar();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
