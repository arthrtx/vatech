import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

let permissoes: string[] = [];
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Rui", papel: "gestor", empresa_id: 1, permissoes } }) }));
const criar = vi.fn();
const pessoas = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    limites: async () => ({ limites: [], prazo_ferias: "2026-04-30" }),
    criarPedido: (...a: unknown[]) => criar(...a),
    pessoasParaPedido: () => pessoas(),
  },
}));

import { ApiError } from "@/lib/api";
import PedidoForm from "./PedidoForm";

const lista = [
  { id: 5, nome: "Ana Costa", avatar_url: null, papel: "funcionario", tipo_nome: "Técnica" },
  { id: 6, nome: "Bruno Dias", avatar_url: null, papel: "funcionario", tipo_nome: null },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const COM = ["pedir_ferias", "pedir_ausencia", "pedir_licenca", "pedir_por_outros"];
const submeter = () => fireEvent.submit(document.querySelector("form") as HTMLFormElement);
async function escolher(nome: string) {
  await waitFor(() => expect((screen.getByRole("combobox", { name: "Pedido em nome de" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("combobox", { name: "Pedido em nome de" }));
  fireEvent.click(screen.getByRole("option", { name: new RegExp(nome) }));
}

describe("PedidoForm: em nome de", () => {
  it("sem a permissão o campo não existe nem chama a API", () => {
    permissoes = ["pedir_ferias", "pedir_ausencia"];
    render(<PedidoForm dataInicial="2099-01-05" />);
    expect(screen.queryByText("Pedido em nome de")).toBeNull();
    expect(pessoas).not.toHaveBeenCalled();
  });

  it("com a permissão, escolher alguém envia user_id e mostra a nota", async () => {
    permissoes = COM;
    pessoas.mockResolvedValue(lista);
    criar.mockResolvedValue({ data: { id: 1 }, avisos: [] });
    render(<PedidoForm dataInicial="2099-01-05" />);
    await escolher("Ana Costa");
    expect(screen.getByText("O pedido fica pendente em nome de Ana Costa.")).toBeTruthy();
    submeter();
    await waitFor(() => expect(criar).toHaveBeenCalled());
    expect(criar.mock.calls[0][0]).toMatchObject({ user_id: 5 });
  });

  it("'Eu próprio' não envia user_id", async () => {
    permissoes = COM;
    pessoas.mockResolvedValue(lista);
    criar.mockResolvedValue({ data: { id: 1 }, avisos: [] });
    render(<PedidoForm dataInicial="2099-01-05" />);
    await escolher("Ana Costa");
    await escolher("Eu próprio");
    expect(screen.queryByText(/fica pendente em nome de/)).toBeNull();
    submeter();
    await waitFor(() => expect(criar).toHaveBeenCalled());
    expect(criar.mock.calls[0][0]).not.toHaveProperty("user_id");
  });

  it("filtra a lista pela pesquisa", async () => {
    permissoes = COM;
    pessoas.mockResolvedValue(lista);
    render(<PedidoForm dataInicial="2099-01-05" />);
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Pedido em nome de" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("combobox", { name: "Pedido em nome de" }));
    fireEvent.change(screen.getByLabelText("Pesquisar pessoas"), { target: { value: "bru" } });
    expect(screen.queryByRole("option", { name: /Ana Costa/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Bruno Dias/ })).toBeTruthy();
  });

  it("mostra carregamento e depois o erro com nova tentativa", async () => {
    permissoes = COM;
    pessoas.mockRejectedValueOnce(new ApiError(500, "Sem acesso")).mockResolvedValueOnce(lista);
    render(<PedidoForm dataInicial="2099-01-05" />);
    expect(screen.getByText("A carregar pessoas...")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar as pessoas"));
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Pedido em nome de" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("mostra o erro 403/422 do servidor ao submeter", async () => {
    permissoes = COM;
    pessoas.mockResolvedValue(lista);
    criar.mockRejectedValue(new ApiError(403, "Sem permissão para pedir por outras pessoas."));
    render(<PedidoForm dataInicial="2099-01-05" />);
    await escolher("Bruno Dias");
    submeter();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Sem permissão"));
  });
});
