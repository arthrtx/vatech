import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DashboardPage from "./page";
import { api, type Papel, type Pedido, type PedidoAgenda } from "@/lib/api";

let papel: Papel = "admin";
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: 1, nome: "Marta Sousa", email: "m@x.pt", papel, empresa_id: 1 } }),
}));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return {
    ...real,
    api: { pedidos: vi.fn(), funcionarios: vi.fn(), agenda: vi.fn(), aprovar: vi.fn(), recusar: vi.fn() },
  };
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-19T12:00:00"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

const ped = (id: number, o: Partial<Pedido> = {}): Pedido => ({
  id,
  empresa_id: 1,
  user_id: 1,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-12-22",
  data_fim: "2027-01-02",
  observacao: null,
  estado: "pendente",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 1, nome: "Marta Sousa" },
  ...o,
});
const ag = (id: number, userId: number, nome: string, o: Partial<PedidoAgenda> = {}): PedidoAgenda => ({
  id,
  user: { id: userId, nome },
  tipo: "ferias",
  data_inicio: "2026-11-17",
  data_fim: "2026-11-21",
  estado: "aprovado",
  ...o,
});
const user = (id: number) => ({ id, nome: `U${id}`, email: "", papel: "funcionario" as const, empresa_id: 1 });

/** Cartao de contador pelo rotulo. */
const cartao = (rotulo: string) => screen.getByText(rotulo, { selector: "p" }).closest("li") as HTMLElement;
const falha = () => new Error("rede");

describe("Dashboard admin", () => {
  beforeEach(() => {
    papel = "admin";
  });

  it("mostra os contadores e as listas com dados", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([ped(10, { user: { id: 2, nome: "Sofia" }, user_id: 2 }), ped(11)]);
    vi.mocked(api.funcionarios).mockResolvedValue([user(1), user(2), user(3)]);
    vi.mocked(api.agenda).mockResolvedValue([
      ag(1, 2, "Ana Ribeiro"),
      ag(2, 3, "Pedro Nunes", { data_inicio: "2026-11-19", data_fim: "2026-11-19", tipo: "ausencia" }),
      ag(3, 4, "Carla Mendes", { data_inicio: "2026-11-24", data_fim: "2026-12-05", tipo: "licenca" }),
      ag(4, 5, "Pendente Longe", { estado: "pendente" }),
      ag(5, 6, "Fora do Intervalo", { data_inicio: "2027-02-01", data_fim: "2027-02-02" }),
    ]);
    render(<DashboardPage />);

    await screen.findByText("Ana Ribeiro");
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    expect(within(cartao("Pedidos pendentes")).getByText("2")).toBeTruthy();
    expect(within(cartao("Ausentes hoje")).getByText("2")).toBeTruthy(); // so aprovados
    expect(within(cartao("Funcionários")).getByText("3")).toBeTruthy();
    expect(screen.getByText("Hoje (2)")).toBeTruthy();
    expect(screen.getByText("Próximos 30 dias (1)")).toBeTruthy();
    expect(screen.getByText("Licença · 2026-11-24 a 2026-12-05 · 12 dias")).toBeTruthy();
    expect(screen.getByText("Ausência · 2026-11-19 · 1 dia")).toBeTruthy();
    expect(screen.queryByText("Pendente Longe")).toBeNull();
    expect(screen.queryByText("Fora do Intervalo")).toBeNull();
    expect(screen.queryByLabelText("Pesquisar pedidos")).toBeNull();
    expect(screen.getByRole("link", { name: "Ver todos os pedidos (2)" })).toBeTruthy();
    expect(api.agenda).toHaveBeenCalledWith("2026-11-19", "2026-12-19");
  });

  it("não mostra vazio nem 0 enquanto carrega (skeleton)", () => {
    vi.mocked(api.pedidos).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.funcionarios).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.agenda).mockReturnValue(new Promise(() => {}));
    const { container } = render(<DashboardPage />);
    expect(container.querySelectorAll("[data-skeleton]").length).toBe(3 + 3 + 2);
    expect(container.querySelectorAll("[aria-busy=true]").length).toBe(2);
    expect(screen.queryByText("Sem pedidos pendentes")).toBeNull();
    expect(screen.queryByText("Ninguém ausente nos próximos 30 dias")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("falha por bloco: contador com '-' (nunca 0), alerta e Tentar de novo só nesse bloco", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([ped(10)]);
    vi.mocked(api.funcionarios).mockResolvedValue([user(1)]);
    vi.mocked(api.agenda).mockRejectedValueOnce(falha()).mockResolvedValue([ag(1, 2, "Ana Ribeiro")]);
    render(<DashboardPage />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Não foi possível carregar a agenda. Verifique a ligação.");
    const ausentes = cartao("Ausentes hoje");
    expect(ausentes.textContent).toContain("-");
    expect(within(ausentes).queryByText("0")).toBeNull();
    // os outros blocos continuam bem
    expect(within(cartao("Pedidos pendentes")).getByText("1")).toBeTruthy();
    expect(within(cartao("Funcionários")).getByText("1")).toBeTruthy();
    expect(screen.getAllByRole("alert").length).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByText("Ana Ribeiro");
    expect(api.agenda).toHaveBeenCalledTimes(2);
    expect(api.pedidos).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("todas as fontes a falhar: três contadores '-' e dois blocos de erro", async () => {
    vi.mocked(api.pedidos).mockRejectedValue(falha());
    vi.mocked(api.funcionarios).mockRejectedValue(falha());
    vi.mocked(api.agenda).mockRejectedValue(falha());
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBe(2));
    for (const r of ["Pedidos pendentes", "Ausentes hoje", "Funcionários"]) {
      expect(cartao(r).textContent).toContain("-");
      expect(within(cartao(r)).queryByText("0")).toBeNull();
    }
  });

  it("vazio: contadores a 0 e caixas explicativas", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([]);
    vi.mocked(api.funcionarios).mockResolvedValue([user(1)]);
    vi.mocked(api.agenda).mockResolvedValue([]);
    render(<DashboardPage />);
    await screen.findByText("Sem pedidos pendentes");
    expect(screen.getByText("Ninguém ausente nos próximos 30 dias")).toBeTruthy();
    expect(within(cartao("Pedidos pendentes")).getByText("0")).toBeTruthy();
    expect(within(cartao("Ausentes hoje")).getByText("0")).toBeTruthy();
    expect(within(cartao("Funcionários")).getByText("1")).toBeTruthy();
  });

  it("aprovar mantém a lista visível, recarrega e o contador baixa", async () => {
    vi.mocked(api.pedidos)
      .mockResolvedValueOnce([ped(10, { user: { id: 2, nome: "Sofia" } }), ped(11, { user: { id: 3, nome: "Tiago" } })])
      .mockResolvedValue([ped(11, { user: { id: 3, nome: "Tiago" } })]);
    vi.mocked(api.funcionarios).mockResolvedValue([user(1)]);
    vi.mocked(api.agenda).mockResolvedValue([]);
    vi.mocked(api.aprovar).mockResolvedValue(ped(10, { estado: "aprovado" }));
    render(<DashboardPage />);
    await screen.findByText(/Sofia/);
    expect(within(cartao("Pedidos pendentes")).getByText("2")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Aprovar" })[0]);
    expect(screen.getByText(/Sofia/)).toBeTruthy(); // sem skeleton durante o recarregamento
    await waitFor(() => expect(screen.queryByText(/Sofia/)).toBeNull());
    expect(api.aprovar).toHaveBeenCalledWith(10);
    expect(within(cartao("Pedidos pendentes")).getByText("1")).toBeTruthy();
  });

  it("falha ao aprovar: erro por cima da lista e o cartão mantém-se", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([ped(10, { user: { id: 2, nome: "Sofia" } })]);
    vi.mocked(api.funcionarios).mockResolvedValue([user(1)]);
    vi.mocked(api.agenda).mockResolvedValue([]);
    vi.mocked(api.aprovar).mockRejectedValue(falha());
    render(<DashboardPage />);
    await screen.findByText(/Sofia/);
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Não foi possível contactar o servidor.");
    expect(screen.getByText(/Sofia/)).toBeTruthy();
  });

  it("limita a 5 pedidos pendentes e conta todos na ligação", async () => {
    vi.mocked(api.pedidos).mockResolvedValue(
      [1, 2, 3, 4, 5, 6, 7].map((i) => ped(i, { user: { id: i + 10, nome: `Pessoa${i}` } })),
    );
    vi.mocked(api.funcionarios).mockResolvedValue([user(1)]);
    vi.mocked(api.agenda).mockResolvedValue([]);
    render(<DashboardPage />);
    await screen.findByText(/Pessoa1 /);
    expect(screen.getAllByRole("button", { name: "Aprovar" }).length).toBe(5);
    expect(screen.getByRole("link", { name: "Ver todos os pedidos (7)" })).toBeTruthy();
  });
});

describe("Dashboard funcionário", () => {
  beforeEach(() => {
    papel = "funcionario";
  });

  it("saudação, contadores por estado e listas", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([
      ped(1, { estado: "pendente" }),
      ped(2, { estado: "aprovado", data_inicio: "2026-12-22", data_fim: "2027-01-02" }),
      ped(3, { estado: "aprovado", tipo: "ausencia", data_inicio: "2026-10-01", data_fim: "2026-10-01" }), // passado
      ped(4, { estado: "recusado" }),
      ped(5, { estado: "recusado" }),
    ]);
    vi.mocked(api.agenda).mockResolvedValue([ag(7, 2, "Ana Ribeiro")]);
    render(<DashboardPage />);
    await screen.findByText("Ana Ribeiro");

    expect(screen.getByRole("heading", { level: 1, name: "Olá, Marta" })).toBeTruthy();
    expect(within(cartao("Pendentes")).getByText("1")).toBeTruthy();
    expect(within(cartao("Aprovados")).getByText("2")).toBeTruthy();
    expect(within(cartao("Recusados")).getByText("2")).toBeTruthy();
    expect(within(cartao("Pendentes")).getByRole("link", { name: "Ver pedidos" })).toBeTruthy();
    expect(within(cartao("Aprovados")).queryByRole("link")).toBeNull();
    // só a ausência futura
    expect(screen.getByText("2026-12-22 a 2027-01-02 · 12 dias")).toBeTruthy();
    expect(screen.queryByText(/2026-10-01/)).toBeNull();
    expect(api.agenda).toHaveBeenCalledWith("2026-11-19", "2026-11-19");
    expect(api.pedidos).toHaveBeenCalledWith(); // todos, sem filtro de estado
  });

  it("D7: de colegas só nome, tipo e datas; exclui os próprios e os pendentes", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([]);
    vi.mocked(api.agenda).mockResolvedValue([
      // colega: chega reduzido, mas mesmo que viessem campos extra nunca se mostram
      {
        ...ag(7, 2, "Ana Ribeiro", { tipo: "ausencia" }),
        subtipo: "medica",
        observacao: "Cirurgia delicada",
        motivo_recusa: "segredo",
      },
      ag(8, 1, "Marta Sousa", { user_id: 1 }), // eu
      ag(9, 3, "Rui Pendente", { estado: "pendente" }),
    ]);
    render(<DashboardPage />);
    await screen.findByText("Ana Ribeiro");
    expect(screen.getByText("Ausência · 2026-11-17 a 2026-11-21")).toBeTruthy();
    expect(screen.queryByText(/Médica/)).toBeNull();
    expect(screen.queryByText(/Cirurgia/)).toBeNull();
    expect(screen.queryByText(/segredo/)).toBeNull();
    expect(screen.queryByText("Rui Pendente")).toBeNull();
    expect(screen.queryByText("Marta Sousa")).toBeNull();
  });

  it("vazio: contadores a 0, ação 'Fazer um pedido' e equipa presente", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([]);
    vi.mocked(api.agenda).mockResolvedValue([]);
    render(<DashboardPage />);
    await screen.findByText("Sem ausências aprovadas");
    expect(screen.getByRole("link", { name: "Fazer um pedido" })).toBeTruthy();
    expect(screen.getByText("Toda a equipa está presente.")).toBeTruthy();
    for (const r of ["Pendentes", "Aprovados", "Recusados"]) {
      expect(within(cartao(r)).getByText("0")).toBeTruthy();
    }
  });

  it("não mostra vazio nem 0 enquanto carrega", () => {
    vi.mocked(api.pedidos).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.agenda).mockReturnValue(new Promise(() => {}));
    const { container } = render(<DashboardPage />);
    expect(container.querySelectorAll("[data-skeleton]").length).toBe(3 + 2 + 2);
    expect(screen.queryByText("Sem ausências aprovadas")).toBeNull();
    expect(screen.queryByText("Toda a equipa está presente.")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("erro em /pedidos: contadores '-' e só esse lado em alerta; a equipa continua", async () => {
    vi.mocked(api.pedidos).mockRejectedValue(falha());
    vi.mocked(api.agenda).mockResolvedValue([ag(7, 2, "Ana Ribeiro")]);
    render(<DashboardPage />);
    await screen.findByText("Ana Ribeiro");
    const alertas = screen.getAllByRole("alert");
    expect(alertas.length).toBe(1);
    expect(alertas[0].textContent).toContain("Não foi possível carregar os seus pedidos.");
    for (const r of ["Pendentes", "Aprovados", "Recusados"]) {
      expect(cartao(r).textContent).toContain("-");
      expect(within(cartao(r)).queryByText("0")).toBeNull();
    }
  });

  it("erro na agenda: alerta com Tentar de novo; contadores intactos", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([ped(1, { estado: "pendente" })]);
    vi.mocked(api.agenda).mockRejectedValueOnce(falha()).mockResolvedValue([]);
    render(<DashboardPage />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Não foi possível carregar a agenda da equipa.");
    expect(within(cartao("Pendentes")).getByText("1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByText("Toda a equipa está presente.");
  });
});
