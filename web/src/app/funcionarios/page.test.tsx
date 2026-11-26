import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FuncionariosPage from "./page";
import { api } from "@/lib/api";

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, papel: "admin" } }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: {
      funcionarios: vi.fn(),
      feriasResumo: vi.fn(),
      convites: { listar: vi.fn(), criar: vi.fn(), reenviar: vi.fn(), revogar: vi.fn() },
      aprovarConta: vi.fn(),
      recusarConta: vi.fn(),
    } };
});

beforeEach(() => {
  vi.mocked(api.feriasResumo).mockResolvedValue({ resumo: [], prazo_ferias: "2026-04-30" });
  vi.mocked(api.convites.listar).mockResolvedValue([]);
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
    await screen.findByText("Ainda não há utilizadores.");
    expect(screen.getByLabelText("Pesquisar pessoas")).toBeTruthy();
    expect(screen.getByText("Ainda não há utilizadores.")).toBeTruthy();
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
  });

  it("não mostra a mensagem de vazio enquanto a API não respondeu, mas mantém o campo", async () => {
    vi.mocked(api.funcionarios).mockReturnValue(new Promise(() => {}));
    render(<FuncionariosPage />);
    await screen.findByLabelText("Pesquisar pessoas");
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
  it("mostra o tipo na lista e não oferece criar, editar nem apagar", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([{ ...mk(2, "Ana", "ana@y.pt"), papel: "estagiario" as const }]);
    render(<FuncionariosPage />);
    await screen.findByText("Ana");
    expect(screen.getByText("Estagiário")).toBeTruthy();
    expect(screen.queryByText("Novo utilizador")).toBeNull();
    expect(screen.queryByRole("button", { name: /Criar|Editar|Apagar/ })).toBeNull();
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

describe("Funcionários: convites e contas por autorizar", () => {
  const convite = { id: 7, nome: "Rui", email: "rui@x.pt", papel: "estagiario" as const, expira_em: "2026-12-10T00:00:00Z", link: "http://x/convite/tok" };

  it("estados vazios", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([]);
    render(<FuncionariosPage />);
    expect(await screen.findByText("Sem convites pendentes.")).toBeTruthy();
    expect(screen.getByText("Nenhuma conta por autorizar.")).toBeTruthy();
  });

  it("cria convite e confirma o envio por email, sem mostrar o link", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([]);
    vi.mocked(api.convites.criar).mockResolvedValue(convite);
    render(<FuncionariosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Convidar funcionário" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Rui" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "rui@x.pt" } });
    fireEvent.change(screen.getByLabelText("Papel"), { target: { value: "estagiario" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }));
    expect(await screen.findByText(/Convite enviado por email para/)).toBeTruthy();
    expect(screen.queryByLabelText("Link do convite")).toBeNull();
    expect(screen.queryByText(convite.link)).toBeNull();
    expect(api.convites.criar).toHaveBeenCalledWith({ nome: "Rui", email: "rui@x.pt", papel: "estagiario" });
  });

  it("reenvia e revoga convites pendentes", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([]);
    vi.mocked(api.convites.listar).mockResolvedValue([convite]);
    vi.mocked(api.convites.reenviar).mockResolvedValue(convite);
    vi.mocked(api.convites.revogar).mockResolvedValue(undefined);
    render(<FuncionariosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Reenviar" }));
    await waitFor(() => expect(api.convites.reenviar).toHaveBeenCalledWith(7));
    fireEvent.click(screen.getByRole("button", { name: "Revogar" }));
    await waitFor(() => expect(api.convites.revogar).toHaveBeenCalledWith(7));
  });

  it("contas pendentes saem da lista principal e podem ser autorizadas ou recusadas", async () => {
    const pend = { ...mk(5, "Eva", "eva@x.pt"), estado_conta: "pendente" as const };
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "João", "j@x.pt"), pend]);
    vi.mocked(api.aprovarConta).mockResolvedValue({ ...pend, estado_conta: "aprovado" });
    vi.mocked(api.recusarConta).mockResolvedValue({ ...pend, estado_conta: "recusado" });
    render(<FuncionariosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Autorizar" }));
    await waitFor(() => expect(api.aprovarConta).toHaveBeenCalledWith(5));
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await waitFor(() => expect(api.recusarConta).toHaveBeenCalledWith(5));
    expect(screen.getAllByText("Eva")).toHaveLength(1);
  });
});
