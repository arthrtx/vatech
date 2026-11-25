import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegistoPage from "./page";
import { ApiError, api } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { registo: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const escrever = (rotulo: string | RegExp, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

function preencher() {
  escrever("Nome", "Ana");
  escrever("Email", "ana@x.pt");
  escrever("Palavra-passe", "segredo123");
  escrever("Confirmar palavra-passe", "segredo123");
}

const submeter = () => fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

describe("Registo", () => {
  it("mostra os campos, a checkbox de termos obrigatória e a ligação aos termos", () => {
    render(<RegistoPage />);
    for (const r of ["Nome", "Email", "Palavra-passe", "Confirmar palavra-passe"]) {
      expect((screen.getByLabelText(r) as HTMLInputElement).required).toBe(true);
    }
    const termos = screen.getByRole("checkbox") as HTMLInputElement;
    expect(termos.required).toBe(true);
    expect(termos.checked).toBe(false);
    expect(screen.getByRole("link", { name: "Termos e Condições" }).getAttribute("href")).toBe("/termos");
    expect(screen.getByRole("link", { name: "Voltar ao login" }).getAttribute("href")).toBe("/login");
  });

  it("envia os dados com aceita_termos e mostra a confirmação de email", async () => {
    vi.mocked(api.registo).mockResolvedValue("ok");
    render(<RegistoPage />);
    preencher();
    fireEvent.click(screen.getByRole("checkbox"));
    submeter();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/ana@x\.pt/));
    expect(api.registo).toHaveBeenCalledWith({
      nome: "Ana",
      email: "ana@x.pt",
      password: "segredo123",
      password_confirmation: "segredo123",
      aceita_termos: true,
    });
    expect(screen.getByRole("link", { name: "Ir para o login" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByLabelText("Nome")).toBeNull();
  });

  it("mostra os erros 422 do servidor e mantém o formulário", async () => {
    vi.mocked(api.registo).mockRejectedValue(
      new ApiError(422, "invalid", { email: ["O email já está registado."], aceita_termos: ["Tem de aceitar os termos."] }),
    );
    render(<RegistoPage />);
    preencher();
    fireEvent.click(screen.getByRole("checkbox"));
    submeter();
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("O email já está registado.");
    expect(alerta.textContent).toContain("Tem de aceitar os termos.");
    expect(screen.getByLabelText("Nome")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Criar conta" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("mostra mensagem genérica quando a API não responde", async () => {
    vi.mocked(api.registo).mockRejectedValue(new TypeError("fetch failed"));
    render(<RegistoPage />);
    preencher();
    fireEvent.click(screen.getByRole("checkbox"));
    submeter();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível contactar o servidor.");
  });
});
