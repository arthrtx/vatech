import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import VistaFuncionario from "./VistaFuncionario";
import { api, type Pedido, type User } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { pedidos: vi.fn(), presencas: vi.fn(), pontes: vi.fn() } };
});

const ana: User = { id: 2, nome: "Ana Ribeiro", email: "ana@x.pt", papel: "funcionario", empresa_id: 1 } as User;
const ped = (id: number, o: Partial<Pedido>): Pedido =>
  ({
    id,
    empresa_id: 1,
    user_id: 2,
    tipo: "ferias",
    subtipo: null,
    data_inicio: "2026-12-22",
    data_fim: "2026-12-24",
    observacao: null,
    estado: "pendente",
    decidido_por: null,
    decidido_em: null,
    motivo_recusa: null,
    ...o,
  }) as Pedido;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-23T12:00:00"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("VistaFuncionario", () => {
  it("mostra só os pedidos da pessoa, contados por estado, e as próximas ausências", async () => {
    vi.mocked(api.pedidos).mockResolvedValue([
      ped(1, { estado: "aprovado" }),
      ped(2, { estado: "pendente", tipo: "ausencia" }),
      ped(3, { estado: "aprovado", data_inicio: "2026-10-01", data_fim: "2026-10-02" }), // passado
      ped(4, { estado: "aprovado", user_id: 9 }), // de outra pessoa
    ]);
    vi.mocked(api.pontes).mockResolvedValue([
      { id: 1, nome: "Ponte da Imaculada", data_inicio: "2026-12-07", data_fim: "2026-12-07" },
      { id: 2, nome: "Ponte antiga", data_inicio: "2026-11-02", data_fim: "2026-11-02" },
    ] as never);
    render(<VistaFuncionario user={ana} onFechar={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Ana Ribeiro" })).toBeTruthy();
    await screen.findByText("Últimos pedidos");
    expect(await screen.findAllByText("22/12/2026 a 24/12/2026")).toHaveLength(3); // 1 próxima + pedidos 1 e 2
    expect(await screen.findByText("Ponte da Imaculada")).toBeTruthy();
    expect(screen.queryByText("Ponte antiga")).toBeNull(); // já passou
    expect(api.presencas).not.toHaveBeenCalled(); // só para estagiários
  });

  it("fecha com o botão e com Escape", () => {
    vi.mocked(api.pedidos).mockResolvedValue([]);
    vi.mocked(api.pontes).mockResolvedValue([]);
    const onFechar = vi.fn();
    render(<VistaFuncionario user={ana} onFechar={onFechar} />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onFechar).toHaveBeenCalledTimes(2);
  });
});
