import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PedidoForm from "./PedidoForm";
import PedidosAdmin from "./PedidosAdmin";
import { ApiError, api, type Papel, type Pedido } from "@/lib/api";

let papelAtual: Papel = "funcionario";
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 2, nome: "Ana", papel: papelAtual } }) }));

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { limites: vi.fn(), criarPedido: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.limites).mockResolvedValue([
    { tipo: "ferias", dias_ano: 22, usados: 8 },
    { tipo: "ausencia", dias_ano: null, usados: 0 },
    { tipo: "licenca", dias_ano: 5, usados: 0 },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pedido: Pedido = {
  id: 7,
  empresa_id: 1,
  user_id: 2,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-12-01",
  data_fim: "2026-12-05",
  observacao: null,
  estado: "pendente",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 2, nome: "Ana" },
};

describe("PedidoForm", () => {
  it("rende os campos com labels e mostra subtipo so em ausencia", () => {
    render(<PedidoForm />);
    expect(screen.getByLabelText("Tipo")).toBeTruthy();
    expect(screen.getByLabelText("Data de início")).toBeTruthy();
    expect(screen.getByLabelText("Data de fim")).toBeTruthy();
    expect(screen.getByLabelText("Descrição")).toBeTruthy();
    expect(screen.queryByLabelText("Subtipo")).toBeNull();
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    fireEvent.click(screen.getByRole("option", { name: "Ausência" }));
    expect(screen.getByLabelText("Subtipo")).toBeTruthy();
  });

  it("estagiário não vê o tipo Férias", () => {
    papelAtual = "estagiario";
    render(<PedidoForm />);
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    expect(screen.queryByRole("option", { name: "Férias" })).toBeNull();
    expect(screen.getByRole("option", { name: "Licença" })).toBeTruthy();
    papelAtual = "funcionario";
  });
});

describe("PedidoForm limites", () => {
  const ano = new Date().getFullYear();
  const datas = (de: string, ate: string) => {
    fireEvent.change(screen.getByLabelText("Data de início"), { target: { value: de } });
    fireEvent.change(screen.getByLabelText("Data de fim"), { target: { value: ate } });
  };

  it("mostra o saldo do tipo escolhido e nada quando não há limite", async () => {
    render(<PedidoForm />);
    expect(await screen.findByText(`Férias: 8 de 22 dias usados em ${ano} (restam 14)`)).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    fireEvent.click(screen.getByRole("option", { name: "Ausência" }));
    expect(screen.queryByText(/dias usados em/)).toBeNull();
  });

  it("avisa antes de submeter quando o pedido excede o que resta", async () => {
    render(<PedidoForm />);
    await screen.findByText(/restam 14/);
    expect(screen.queryByText(/só restam/)).toBeNull();
    datas(`${ano + 1}-01-01`, `${ano + 1}-01-20`);
    expect(screen.getByText(`Este pedido tem 20 dias e só restam 14 de férias em ${ano}.`)).toBeTruthy();
    datas(`${ano + 1}-01-01`, `${ano + 1}-01-10`);
    expect(screen.queryByText(/só restam/)).toBeNull();
  });

  it("mostra o erro 422 do servidor ao submeter", async () => {
    vi.mocked(api.criarPedido).mockRejectedValue(
      new ApiError(422, "Erro", { data_fim: [`Excede o limite de 22 dias de ferias em ${ano}. Restam 14.`] }),
    );
    render(<PedidoForm />);
    await screen.findByText(/restam 14/);
    datas(`${ano + 1}-01-01`, `${ano + 1}-01-03`);
    fireEvent.click(screen.getByRole("button", { name: "Submeter pedido" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Excede o limite de 22 dias de ferias"));
  });
});

describe("PedidosAdmin", () => {
  it("tem Aprovar e Recusar e exige motivo", () => {
    const aprovar = vi.fn();
    const recusar = vi.fn();
    render(<PedidosAdmin pedidos={[pedido]} onAprovar={aprovar} onRecusar={recusar} />);
    expect(screen.getByText(/Ana ·/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(aprovar).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    const confirmar = screen.getByRole("button", { name: "Confirmar recusa" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Motivo da recusa/), { target: { value: "Sem cobertura" } });
    fireEvent.click(confirmar);
    expect(recusar).toHaveBeenCalledWith(7, "Sem cobertura");
  });
});
