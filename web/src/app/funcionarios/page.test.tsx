import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FuncionariosPage from "./page";
import { api } from "@/lib/api";

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { funcionarios: vi.fn(), criarFuncionario: vi.fn(), feriasResumo: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.feriasResumo).mockResolvedValue({ resumo: [], prazo_ferias: "2026-04-30" });
});
afterEach(cleanup);

const mk = (id: number, nome: string, email: string) => ({ id, nome, email, papel: "funcionario" as const, empresa_id: 1 });

describe("Funcionários: busca", () => {
  it("filtra por nome e email, mostra mensagem sem resultados e limpar repõe", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "João Álvares", "j@x.pt"), mk(2, "Ana", "ana@y.pt")]);
    render(<FuncionariosPage />);
    await screen.findByText("João Álvares");
    const campo = screen.getByLabelText("Pesquisar pessoas");
    fireEvent.change(campo, { target: { value: "alvares" } });
    expect(screen.queryByText("Ana")).toBeNull();
    fireEvent.change(campo, { target: { value: "ana@y" } });
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.queryByText("João Álvares")).toBeNull();
    fireEvent.change(campo, { target: { value: "zzz" } });
    expect(screen.getByText('Nenhum resultado para "zzz"')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(document.activeElement).toBe(campo);
    expect(screen.getByText("João Álvares")).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(api.funcionarios).toHaveBeenCalledTimes(1);
  });
});

describe("Funcionários: lista vazia", () => {
  it("mostra o campo de busca e a mensagem de vazio", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([]);
    render(<FuncionariosPage />);
    await screen.findByText("Novo utilizador");
    expect(screen.getByLabelText("Pesquisar pessoas")).toBeTruthy();
    expect(screen.getByText("Ainda não há utilizadores.")).toBeTruthy();
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
  });

  it("não mostra a mensagem de vazio enquanto a API não respondeu, mas mantém o campo", async () => {
    vi.mocked(api.funcionarios).mockReturnValue(new Promise(() => {}));
    render(<FuncionariosPage />);
    await screen.findByText("Novo utilizador");
    expect(screen.getByLabelText("Pesquisar pessoas")).toBeTruthy();
    expect(screen.queryByText("Ainda não há utilizadores.")).toBeNull();
  });

  it("não mostra a mensagem de vazio se a API falhar", async () => {
    vi.mocked(api.funcionarios).mockRejectedValue(new Error("falhou"));
    render(<FuncionariosPage />);
    await screen.findByRole("alert");
    expect(screen.queryByText("Ainda não há utilizadores.")).toBeNull();
  });
});

describe("Funcionários: tipo", () => {
  it("mostra o tipo na lista e cria com o tipo escolhido", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([{ ...mk(2, "Ana", "ana@y.pt"), papel: "estagiario" as const }]);
    vi.mocked(api.criarFuncionario).mockResolvedValue(mk(5, "Novo", "n@x.pt"));
    render(<FuncionariosPage />);
    await screen.findByText("Ana");
    expect(screen.getByText("Estagiário")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Novo" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "n@x.pt" } });
    fireEvent.change(screen.getByLabelText("Palavra-passe"), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    fireEvent.click(screen.getByRole("option", { name: "Estagiário" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar utilizador" }));
    await waitFor(() =>
      expect(api.criarFuncionario).toHaveBeenCalledWith({ nome: "Novo", email: "n@x.pt", password: "segredo123", papel: "estagiario" }),
    );
  });
});

describe("Funcionários: férias por pessoa", () => {
  it("mostra usados/total com transitados, e nada sem limite anual", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "João", "j@x.pt"), mk(2, "Ana", "ana@y.pt"), mk(3, "Rui", "r@z.pt")]);
    vi.mocked(api.feriasResumo).mockResolvedValue({
      resumo: [
        { user_id: 1, nome: "João", dias_ano: 22, transitados: 8, usados: 8, por_marcar: 22 },
        { user_id: 2, nome: "Ana", dias_ano: 22, transitados: 0, usados: 5, por_marcar: 17 },
        { user_id: 3, nome: "Rui", dias_ano: null, transitados: 0, usados: 0, por_marcar: 0 },
      ],
      prazo_ferias: "2026-04-30",
    });
    render(<FuncionariosPage />);
    expect(await screen.findByText("Férias: 8/30 dias úteis (8 transitados)")).toBeTruthy();
    expect(screen.getByText("Férias: 5/22 dias úteis")).toBeTruthy();
    expect(screen.getAllByText(/^Férias:/)).toHaveLength(2);
  });
});
