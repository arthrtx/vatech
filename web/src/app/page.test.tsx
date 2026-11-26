import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import Home from "./page";
import { api, type Papel, type Pedido } from "@/lib/api";

let papel: Papel = "admin";
let permissoes: string[] = [];
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/AvisoFerias", () => ({ default: () => null }));
vi.mock("@/components/PedidoForm", () => ({ default: () => <p>FORMULARIO</p> }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: 1, nome: "Marta", email: "m@x.pt", papel, permissoes, empresa_id: 1 } }),
}));
vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { pedidos: vi.fn(), aprovar: vi.fn(), recusar: vi.fn() } };
});

beforeEach(() => {
  papel = "admin";
  permissoes = [];
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const ped = (id: number, o: Partial<Pedido> = {}): Pedido => ({
  id,
  empresa_id: 1,
  user_id: 1,
  tipo: "ausencia",
  subtipo: null,
  data_inicio: "2026-12-01",
  data_fim: "2026-12-02",
  observacao: null,
  estado: "aprovado",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 1, nome: "Marta" },
  ...o,
});
const outro = (id: number, nome: string, o: Partial<Pedido> = {}) => ped(id, { user_id: 9, user: { id: 9, nome }, ...o });

async function abrir(lista: Pedido[]) {
  vi.mocked(api.pedidos).mockResolvedValue(lista);
  render(<Home />);
  await waitFor(() => expect(api.pedidos).toHaveBeenCalled());
  await screen.findByRole("region", { name: "Os meus pedidos" });
}
const bloco = (nome: string) => screen.getByRole("region", { name: nome });

describe("Pedidos: dois blocos", () => {
  it("admin vê Os meus pedidos e Pedidos da equipa, cada um com os seus", async () => {
    await abrir([ped(1), ped(2, { estado: "pendente" }), outro(3, "Rui Dias", { estado: "pendente" })]);
    expect(within(bloco("Os meus pedidos")).queryByText(/Rui Dias/)).toBeNull();
    expect(within(bloco("Pedidos da equipa")).getByText(/Rui Dias/)).toBeTruthy();
    expect(within(bloco("Pedidos da equipa")).queryByText(/Marta/)).toBeNull();
  });

  it("gestor (aprovar_pedidos) vê os dois blocos", async () => {
    papel = "funcionario";
    permissoes = ["aprovar_pedidos"];
    await abrir([ped(1), outro(3, "Rui Dias", { estado: "pendente" })]);
    expect(bloco("Pedidos da equipa")).toBeTruthy();
    expect(within(bloco("Pedidos da equipa")).getByRole("button", { name: "Aprovar" })).toBeTruthy();
  });

  it("funcionário só vê Os meus pedidos", async () => {
    papel = "funcionario";
    await abrir([ped(1)]);
    expect(screen.queryByRole("region", { name: "Pedidos da equipa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Aprovar" })).toBeNull();
  });

  it("contagens: total, por estado nos meus e «N por decidir» na equipa", async () => {
    await abrir([
      ped(1),
      ped(2, { estado: "pendente" }),
      ped(3, { estado: "pendente" }),
      outro(4, "Rui Dias", { estado: "pendente" }),
      outro(5, "Ana Lopes"),
    ]);
    const meus = bloco("Os meus pedidos");
    expect(meus.querySelector("[data-total]")?.textContent).toBe("3 pedidos");
    expect(within(meus).getByText("Pendente: 2")).toBeTruthy();
    expect(within(meus).getByText("Aprovado: 1")).toBeTruthy();
    const equipa = bloco("Pedidos da equipa");
    expect(equipa.querySelector("[data-total]")?.textContent).toBe("2 pedidos");
    expect(within(equipa).getByText("1 por decidir")).toBeTruthy();
  });

  it("equipa: pendentes primeiro, depois os mais recentes", async () => {
    await abrir([
      outro(10, "Aprovada Antiga", { estado: "aprovado" }),
      outro(11, "Pendente Velha", { estado: "pendente" }),
      outro(12, "Aprovada Nova", { estado: "aprovado" }),
      outro(13, "Pendente Nova", { estado: "pendente" }),
    ]);
    const equipa = bloco("Pedidos da equipa");
    // O filtro de estado arranca em «Pendente»: limpa-o para ver todos.
    (within(equipa).getByRole("button", { name: "Limpar filtros" }) as HTMLButtonElement).click();
    await waitFor(() => expect(within(equipa).getAllByRole("listitem").filter((li) => li.id).length).toBe(4));
    const nomes = within(equipa)
      .getAllByRole("listitem")
      .filter((li) => li.id.startsWith("pedido-"))
      .map((li) => li.querySelector("p")?.textContent?.split(" · ")[0]);
    expect(nomes).toEqual(["Pendente Nova", "Pendente Velha", "Aprovada Nova", "Aprovada Antiga"]);
  });

  it("vazio distinto por bloco", async () => {
    await abrir([]);
    expect(within(bloco("Os meus pedidos")).getByText("Ainda não fez nenhum pedido.")).toBeTruthy();
    expect(within(bloco("Pedidos da equipa")).getByText("Ainda ninguém da equipa fez pedidos.")).toBeTruthy();
    expect(within(bloco("Pedidos da equipa")).getByText("Nada por decidir")).toBeTruthy();
  });

  it("cada cartão tem Ver no calendário e nº de dias úteis (1 de dezembro é feriado)", async () => {
    await abrir([ped(1), outro(2, "Rui Dias", { estado: "pendente" })]);
    expect(within(bloco("Os meus pedidos")).getByRole("link", { name: "Ver no calendário" })).toBeTruthy();
    expect(within(bloco("Pedidos da equipa")).getByRole("link", { name: "Ver no calendário" })).toBeTruthy();
    expect(within(bloco("Os meus pedidos")).getByText("1 dia útil")).toBeTruthy();
  });
});
