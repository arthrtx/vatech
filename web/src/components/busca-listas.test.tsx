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

const limparFiltros = () => fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
const itens = () => screen.queryAllByRole("listitem").length;
const chip = (n: string) => screen.getByRole("button", { name: n, pressed: undefined });

describe.each(listas)("busca em %s", (_nome, montar) => {
  it("filtra por nome, rótulo do tipo e rótulo do estado (sem acentos)", () => {
    render(montar());
    limparFiltros();
    const campo = screen.getByLabelText("Pesquisar pedidos");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.change(campo, { target: { value: "joao" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(campo, { target: { value: "licença" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(campo, { target: { value: "recusado" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem").textContent).toMatch(/Ausência/);
  });

  it("sem resultados mostra mensagem e limpar repõe a lista", () => {
    render(montar());
    limparFiltros();
    fireEvent.change(screen.getByLabelText("Pesquisar pedidos"), { target: { value: "xyz" } });
    expect(screen.getByText('Nenhum resultado para "xyz"')).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Pesquisar pedidos"));
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Limpar" })).toBeNull();
  });
});

describe.each([
  ["PedidosAdmin", () => <PedidosAdmin pedidos={[]} onAprovar={vi.fn()} onRecusar={vi.fn()} />, "Sem pedidos."],
  ["ListaPedidos", () => <ListaPedidos pedidos={[]} />, "Ainda não há pedidos."],
] as const)("lista vazia em %s", (_nome, montar, vazio) => {
  it("mostra o campo de busca e a mensagem de vazio, sem «Nenhum resultado»", () => {
    render(montar());
    const campo = screen.getByLabelText("Pesquisar pedidos");
    expect(screen.getByText(vazio)).toBeTruthy();
    fireEvent.change(campo, { target: { value: "x" } });
    expect(screen.getByText(vazio)).toBeTruthy();
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
  });
});

describe("filtro de estado inicial", () => {
  it("admin: pendente vem pré-selecionado e mostra «1 de 3 pedidos»", () => {
    render(<PedidosAdmin pedidos={pedidos} onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    expect(chip("Pendente").getAttribute("aria-pressed")).toBe("true");
    expect(itens()).toBe(1);
    expect(screen.getByRole("status").textContent).toBe("1 de 3 pedidos");
  });

  it("funcionário: arranca sem filtro de estado e mostra todos", () => {
    render(<ListaPedidos pedidos={pedidos} />);
    expect(chip("Pendente").getAttribute("aria-pressed")).toBe("false");
    expect(itens()).toBe(3);
    expect(screen.getByRole("status").textContent).toBe("3 de 3 pedidos");
  });
});

describe.each(listas)("filtros em %s", (_nome, montar) => {
  it("filtra por estado (multi-seleção) e tipo", () => {
    render(montar());
    limparFiltros();
    fireEvent.click(chip("Aprovado"));
    expect(itens()).toBe(1);
    expect(screen.getByRole("status").textContent).toBe("1 de 3 pedidos");
    fireEvent.click(chip("Pendente"));
    expect(itens()).toBe(2);
    fireEvent.click(chip("Licença"));
    expect(itens()).toBe(1);
    fireEvent.click(chip("Férias"));
    expect(itens()).toBe(2);
    expect(screen.getByRole("status").textContent).toBe("2 de 3 pedidos");
  });

  it("filtra por período (sobreposição) e avisa se até < de", () => {
    render(montar());
    limparFiltros();
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-12-06" } });
    expect(itens()).toBe(0);
    expect(screen.getByText("Sem resultados com estes filtros.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-12-05" } });
    expect(itens()).toBe(3);
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-11-30" } });
    expect(screen.getByText("A data final é anterior à inicial")).toBeTruthy();
    expect(itens()).toBe(3);
  });

  it("limpar filtros repõe tudo e desativa o botão; a busca combina (AND)", () => {
    render(montar());
    limparFiltros();
    fireEvent.click(chip("Aprovado"));
    fireEvent.change(screen.getByLabelText("Pesquisar pedidos"), { target: { value: "joao" } });
    expect(itens()).toBe(1);
    limparFiltros();
    expect(itens()).toBe(1);
    expect((screen.getByRole("button", { name: "Limpar filtros" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("1 de 3 pedidos");
  });
});

describe("filtro Funcionário", () => {
  it("existe no admin e filtra", () => {
    render(<PedidosAdmin pedidos={pedidos} onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    limparFiltros();
    fireEvent.change(screen.getByLabelText("Funcionário"), { target: { value: "3" } });
    expect(itens()).toBe(1);
    expect(screen.getByRole("listitem").textContent).toMatch(/João/);
    expect(screen.getByRole("status").textContent).toBe("1 de 3 pedidos");
  });

  it("não existe para o funcionário", () => {
    render(<ListaPedidos pedidos={pedidos} />);
    expect(screen.queryByLabelText("Funcionário")).toBeNull();
  });

  it("admin só mostra Aprovar/Recusar em pedidos pendentes", () => {
    render(<PedidosAdmin pedidos={pedidos} onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Aprovar" })).toHaveLength(1);
    limparFiltros();
    expect(screen.getAllByRole("button", { name: "Aprovar" })).toHaveLength(1);
  });

  it("semBusca (dashboard) não mostra filtros nem filtra por estado", () => {
    render(<PedidosAdmin semBusca pedidos={pedidos} onAprovar={vi.fn()} onRecusar={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
    expect(itens()).toBe(3);
  });
});
