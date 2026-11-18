import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PedidosAdmin from "./PedidosAdmin";
import ListaPedidos from "./ListaPedidos";
import type { Pedido } from "@/lib/api";

afterEach(cleanup);

const base: Pedido = {
  id: 1,
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
const pedidos: Pedido[] = [
  base,
  { ...base, id: 2, user_id: 3, tipo: "licenca", estado: "aprovado", user: { id: 3, nome: "João" } },
  { ...base, id: 3, user_id: 4, tipo: "ausencia", subtipo: "medica", estado: "recusado", user: { id: 4, nome: "Rui" } },
];

const listas = [
  ["PedidosAdmin", () => <PedidosAdmin pedidos={pedidos} onAprovar={vi.fn()} onRecusar={vi.fn()} />],
  ["ListaPedidos", () => <ListaPedidos pedidos={pedidos} />],
] as const;

describe.each(listas)("busca em %s", (_nome, montar) => {
  it("filtra por nome, rótulo do tipo e rótulo do estado (sem acentos)", () => {
    render(montar());
    const campo = screen.getByLabelText("Pesquisar pedidos");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.change(campo, { target: { value: "joao" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(campo, { target: { value: "licença" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(campo, { target: { value: "recusado" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/Ausência/)).toBeTruthy();
  });

  it("sem resultados mostra mensagem e limpar repõe a lista", () => {
    render(montar());
    fireEvent.change(screen.getByLabelText("Pesquisar pedidos"), { target: { value: "xyz" } });
    expect(screen.getByText('Nenhum resultado para "xyz"')).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Limpar" })).toBeNull();
  });
});

describe("estado vazio original", () => {
  it("lista sem pedidos mantém a mensagem própria e não mostra busca", () => {
    render(<ListaPedidos pedidos={[]} />);
    expect(screen.getByText("Ainda não há pedidos.")).toBeTruthy();
    expect(screen.queryByLabelText("Pesquisar pedidos")).toBeNull();
  });
});
