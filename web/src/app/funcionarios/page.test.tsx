import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FuncionariosPage from "./page";
import { ApiError, api } from "@/lib/api";

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, papel: "admin" } }) }));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: {
      funcionarios: vi.fn(),
      getTipos: vi.fn(),
      definirTipoPessoa: vi.fn(),
      feriasResumo: vi.fn(),
      pedidos: vi.fn(),
      pontes: vi.fn(),
      presencas: vi.fn(),
      definirEstagio: vi.fn(),
      convites: { listar: vi.fn(), criar: vi.fn(), reenviar: vi.fn(), revogar: vi.fn() },
      aprovarConta: vi.fn(),
      recusarConta: vi.fn(),
    } };
});

beforeEach(() => {
  vi.mocked(api.feriasResumo).mockResolvedValue({ resumo: [], prazo_ferias: "2026-04-30" });
  vi.mocked(api.convites.listar).mockResolvedValue([]);
  vi.mocked(api.pedidos).mockResolvedValue([]);
  vi.mocked(api.pontes).mockResolvedValue([]);
  vi.mocked(api.presencas).mockResolvedValue([]);
  vi.mocked(api.getTipos).mockResolvedValue([{ id: 7, nome: "Responsável de RH", base: "funcionario", permissoes: {}, em_uso: 0 }]);
});
afterEach(cleanup);

const mk = (id: number, nome: string, email: string) => ({ id, nome, email, papel: "funcionario" as const, empresa_id: 1 });

describe("Funcionários: cabeçalho e filtro por papel", () => {
  it("mostra o nº de pessoas e filtra por papel", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "João Álvares", "j@x.pt"), { ...mk(2, "Ana", "ana@y.pt"), papel: "estagiario" as const }]);
    render(<FuncionariosPage />);
    await screen.findByText("João Álvares");
    expect(screen.getByText("2 pessoas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Estagiários" }));
    expect(screen.getByRole("button", { name: "Estagiários" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("João Álvares")).toBeNull();
    expect(screen.getByText("Ana")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Administradores" }));
    expect(screen.getByText("Ninguém com este papel.")).toBeTruthy();
  });
});

describe("Funcionários: lista vazia", () => {
  it("mostra a mensagem de vazio e não tem caixa de pesquisa", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([]);
    render(<FuncionariosPage />);
    await screen.findByText("Ainda não há utilizadores.");
    expect(screen.queryByLabelText("Pesquisar pessoas")).toBeNull();
    expect(screen.getByText("Ainda não há utilizadores.")).toBeTruthy();
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
  });

  it("não mostra a mensagem de vazio enquanto a API não respondeu", async () => {
    vi.mocked(api.funcionarios).mockReturnValue(new Promise(() => {}));
    render(<FuncionariosPage />);
    await screen.findByRole("heading", { name: "Pessoas", level: 1 });
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
    expect(screen.getByText("Estagiário", { selector: "p" })).toBeTruthy();
    expect(screen.queryByText("Novo utilizador")).toBeNull();
    expect(screen.queryByRole("button", { name: /Criar|Editar|Apagar/ })).toBeNull();
  });
});

describe("Funcionários: férias por pessoa", () => {
  it("mostra usados/total com transitados, e nada sem limite anual", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "João", "j@x.pt"), mk(2, "Ana", "ana@y.pt"), mk(3, "Rui", "r@z.pt")]);
    vi.mocked(api.feriasResumo).mockResolvedValue({
      resumo: [
        { user_id: 1, nome: "João", dias_ano: 22, dias_max: 25, transitados: 8, usados: 8, por_marcar: 22 },
        { user_id: 2, nome: "Ana", dias_ano: 22, dias_max: 25, transitados: 0, usados: 5, por_marcar: 17 },
        { user_id: 3, nome: "Rui", dias_ano: null, dias_max: null, transitados: 0, usados: 0, por_marcar: 0 },
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
    expect(screen.queryByText("Por autorizar")).toBeNull();
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

describe("Funcionários: ficha do estagiário", () => {
  it("edita início, fim e instituição e guarda com definirEstagio", async () => {
    const est = { ...mk(4, "Teresa", "t@x.pt"), papel: "estagiario" as const, estagio_inicio: "2026-09-01", estagio_fim: null, instituicao_ensino: null };
    vi.mocked(api.funcionarios).mockResolvedValue([est]);
    vi.mocked(api.definirEstagio).mockResolvedValue({ ...est, estagio_fim: "2027-06-30", instituicao_ensino: "ISEP" });
    render(<FuncionariosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Ver Teresa" }));
    expect((screen.getByLabelText("Data de início") as HTMLInputElement).value).toBe("2026-09-01");
    fireEvent.change(screen.getByLabelText("Data de fim"), { target: { value: "2027-06-30" } });
    fireEvent.change(screen.getByLabelText("Instituição de ensino"), { target: { value: "ISEP" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar estágio" }));
    await waitFor(() =>
      expect(api.definirEstagio).toHaveBeenCalledWith(4, { estagio_inicio: "2026-09-01", estagio_fim: "2027-06-30", instituicao_ensino: "ISEP" }),
    );
    expect(await screen.findByText("Estágio guardado.")).toBeTruthy();
  });

  it("mostra o 422 do servidor", async () => {
    const est = { ...mk(4, "Teresa", "t@x.pt"), papel: "estagiario" as const };
    vi.mocked(api.funcionarios).mockResolvedValue([est]);
    vi.mocked(api.definirEstagio).mockRejectedValue(new ApiError(422, "A data de fim não pode ser anterior ao início."));
    render(<FuncionariosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Ver Teresa" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar estágio" }));
    expect((await screen.findByRole("alert")).textContent).toContain("anterior ao início");
  });
});

describe("Funcionários: tipo da pessoa", () => {
  it("mostra o tipo e o select muda-o com tipo_id (null para papéis base)", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([{ ...mk(1, "Rui", "rui@x.pt"), tipo_id: null, tipo_nome: null }]);
    vi.mocked(api.definirTipoPessoa).mockResolvedValue({ ...mk(1, "Rui", "rui@x.pt"), tipo_id: 7, tipo_nome: "Responsável de RH" });
    render(<FuncionariosPage />);
    expect(screen.queryByLabelText("Tipo")).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Ver Rui" }));
    const select = (await screen.findByLabelText("Tipo")) as HTMLSelectElement;
    await screen.findByRole("option", { name: "Responsável de RH" });
    fireEvent.change(select, { target: { value: "t7" } });
    await waitFor(() => expect(api.definirTipoPessoa).toHaveBeenCalledWith(1, 7, undefined));
    expect((await screen.findAllByText("Responsável de RH", { selector: "p" })).length).toBeGreaterThan(0);
    fireEvent.change(select, { target: { value: "estagiario" } });
    await waitFor(() => expect(api.definirTipoPessoa).toHaveBeenLastCalledWith(1, null, "estagiario"));
  });

  it("mostra o erro do servidor ao mudar o tipo", async () => {
    vi.mocked(api.funcionarios).mockResolvedValue([mk(1, "Rui", "rui@x.pt")]);
    vi.mocked(api.definirTipoPessoa).mockRejectedValue(new ApiError(422, "Tipo inválido."));
    render(<FuncionariosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Ver Rui" }));
    await screen.findByRole("option", { name: "Responsável de RH" });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "t7" } });
    expect((await screen.findByRole("alert")).textContent).toContain("Tipo inválido.");
  });
});
