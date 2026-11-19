import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PedidoForm from "./PedidoForm";
import PedidosAdmin from "./PedidosAdmin";
import ListaPedidos from "./ListaPedidos";
import { formatarData } from "@/lib/rotulos";
import { diasUteis } from "@/lib/diasUteis";
import { somaDias } from "@/lib/agenda";
import { ApiError, api, type Papel, type Pedido } from "@/lib/api";

let papelAtual: Papel = "funcionario";
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 2, nome: "Ana", papel: papelAtual } }) }));

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { limites: vi.fn(), criarPedido: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(api.limites).mockResolvedValue({
    limites: [
      { tipo: "ferias", dias_ano: 22, transitados: 0, usados: 8 },
      { tipo: "ausencia", dias_ano: null, transitados: 0, usados: 0 },
      { tipo: "licenca", dias_ano: 5, transitados: 0, usados: 0 },
    ],
    prazo_ferias: "2026-04-30",
  });
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
  /** Período a partir de 1 jan do ano seguinte com exactamente n dias úteis. */
  const periodo = (n: number): [string, string] => {
    const de = `${ano + 1}-01-01`;
    let ate = de;
    while (diasUteis(de, ate) < n) ate = somaDias(ate, 1);
    return [de, ate];
  };
  const datas = (de: string, ate: string) => {
    fireEvent.change(screen.getByLabelText("Data de início"), { target: { value: de } });
    fireEvent.change(screen.getByLabelText("Data de fim"), { target: { value: ate } });
  };

  it("mostra o saldo do tipo escolhido e nada quando não há limite", async () => {
    render(<PedidoForm />);
    expect(await screen.findByText(`Férias: 8 de 22 dias úteis usados em ${ano} (restam 14)`)).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo" }));
    fireEvent.click(screen.getByRole("option", { name: "Ausência" }));
    expect(screen.queryByText(/dias úteis usados em/)).toBeNull();
  });

  it("mostra o cúmulo com os dias transitados e conta-os no aviso de exceder", async () => {
    vi.mocked(api.limites).mockResolvedValue({
      limites: [{ tipo: "ferias", dias_ano: 22, transitados: 8, usados: 8 }],
      prazo_ferias: "2026-04-30",
    });
    render(<PedidoForm />);
    expect(await screen.findByText(`Férias: 8 de 30 dias úteis usados em ${ano} (22 do ano + 8 transitados; restam 22)`)).toBeTruthy();
    datas(...periodo(22));
    expect(screen.queryByText(/só restam/)).toBeNull();
    datas(...periodo(23));
    expect(screen.getByText(`Este pedido tem 23 dias úteis e só restam 22 de férias em ${ano}.`)).toBeTruthy();
  });

  it("avisa antes de submeter quando o pedido excede o que resta", async () => {
    render(<PedidoForm />);
    await screen.findByText(/restam 14/);
    expect(screen.queryByText(/só restam/)).toBeNull();
    datas(...periodo(20));
    expect(screen.getByText(`Este pedido tem 20 dias úteis e só restam 14 de férias em ${ano}.`)).toBeTruthy();
    datas(...periodo(10));
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

  it("mostra data dd/mm/aaaa e foca o motivo ao recusar", () => {
    render(<PedidosAdmin pedidos={[pedido]} onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    expect(screen.getByText("01/12/2026 a 05/12/2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    expect(document.activeElement).toBe(screen.getByLabelText(/Motivo da recusa/));
  });

  it("mostra carregamento em vez do estado vazio", () => {
    render(<PedidosAdmin pedidos={[]} carregando onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("A carregar");
    expect(screen.queryByText(/Sem pedidos/)).toBeNull();
    cleanup();
    render(<PedidosAdmin pedidos={[]} onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    expect(screen.getByText("Sem pedidos.")).toBeTruthy();
  });
});

describe("ListaPedidos", () => {
  it("mostra carregamento e datas dd/mm/aaaa", () => {
    render(<ListaPedidos pedidos={[]} carregando />);
    expect(screen.getByRole("status").textContent).toContain("A carregar");
    cleanup();
    render(<ListaPedidos pedidos={[pedido]} />);
    expect(screen.getByText("01/12/2026 a 05/12/2026")).toBeTruthy();
  });

  it("formatarData converte ISO", () => {
    expect(formatarData("2026-01-09")).toBe("09/01/2026");
  });
});
