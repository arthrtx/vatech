import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Agenda from "./Agenda";
import type { Pedido, PedidoAgenda } from "@/lib/api";

afterEach(cleanup);

const p = (o: Partial<Pedido>): Pedido => ({
  id: 1,
  empresa_id: 1,
  user_id: 1,
  tipo: "ferias",
  subtipo: null,
  data_inicio: "2026-11-27",
  data_fim: "2026-12-03",
  observacao: null,
  estado: "aprovado",
  decidido_por: null,
  decidido_em: null,
  motivo_recusa: null,
  user: { id: 1, nome: "Ana" },
  ...o,
});

const pedidos = [
  p({}),
  p({ id: 2, user_id: 2, user: { id: 2, nome: "Rui" }, data_inicio: "2026-12-01", data_fim: "2026-12-02", estado: "pendente" }),
  p({ id: 3, estado: "recusado", user: { id: 1, nome: "Ana" }, tipo: "licenca" }),
];

describe("Agenda", () => {
  it("navega por texto, assinala sobreposicao e esconde recusados", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByText("Dezembro 2026")).toBeTruthy();
    expect(screen.getAllByText("Sobreposição").length).toBe(2);
    expect(screen.queryByText(/Ana · Licença/)).toBeNull();
    fireEvent.click(screen.getByText("Mês anterior"));
    expect(screen.getByText("Novembro 2026")).toBeTruthy();
    fireEvent.click(screen.getByText("Mês anterior"));
    expect(screen.getByText("Outubro 2026")).toBeTruthy();
    expect(screen.queryByText("Sobreposição")).toBeNull();
  });

  it("filtros alteram a grelha e a sobreposicao persiste ao filtrar", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getAllByTitle(/\((aprovado|pendente)\)/).length).toBe(6);
    fireEvent.change(screen.getByLabelText("Funcionário"), { target: { value: "2" } });
    expect(screen.getAllByTitle(/\((aprovado|pendente)\)/).length).toBe(2);
    expect(screen.getAllByText("Sobreposição").length).toBe(2);
    fireEvent.change(screen.getByLabelText("Funcionário"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Licença" }));
    expect(screen.queryAllByTitle(/\((aprovado|pendente)\)/).length).toBe(0);
    expect(screen.getAllByText("Sobreposição").length).toBe(2);
    expect(screen.getByText("Sem resultados com estes filtros.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getAllByTitle(/\((aprovado|pendente)\)/).length).toBe(6);
  });

  it("destaca hoje, distingue pendente por texto e estilo, e usa linhas ARIA", () => {
    const { container } = render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    const hoje = container.querySelector('[aria-current="date"]');
    expect(hoje?.textContent).toContain("1");
    expect(hoje?.textContent).toContain("(hoje)");
    const pend = screen.getAllByText(/\(pendente\)/);
    expect(pend.length).toBe(2);
    expect(pend[0].closest("button.truncate")?.className).toContain("border-dashed");
    const celulas = [...container.querySelectorAll('[role="gridcell"]')];
    expect(celulas.length % 7).toBe(0);
    expect(celulas.every((c) => c.parentElement?.getAttribute("role") === "row")).toBe(true);
  });

  it("filtro de funcionario ignora quem so tem recusados", () => {
    const so = [...pedidos, p({ id: 9, user_id: 3, user: { id: 3, nome: "Zé" }, estado: "recusado" })];
    render(<Agenda pedidos={so} admin hoje="2026-12-01" />);
    expect(screen.queryByRole("option", { name: "Zé" })).toBeNull();
    expect(screen.getByRole("option", { name: "Rui" })).toBeTruthy();
  });

  it("vazio, a carregar e erro sao estados distintos", () => {
    const { rerender } = render(<Agenda pedidos={[]} admin hoje="2026-12-01" />);
    expect(screen.getByText("Sem pedidos neste mês.")).toBeTruthy();
    rerender(<Agenda pedidos={[]} admin hoje="2026-12-01" aCarregar />);
    expect(screen.getByText("A carregar pedidos...")).toBeTruthy();
    expect(screen.queryByText("Sem pedidos neste mês.")).toBeNull();
    rerender(<Agenda pedidos={[]} admin hoje="2026-12-01" comErro />);
    expect(screen.getByText("Não foi possível carregar os pedidos.")).toBeTruthy();
    expect(screen.queryByText("Sem pedidos neste mês.")).toBeNull();
  });

  it("filtro de funcionario so para admin", () => {
    const { rerender } = render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByLabelText("Funcionário")).toBeTruthy();
    rerender(<Agenda pedidos={pedidos} admin={false} hoje="2026-12-01" />);
    expect(screen.queryByLabelText("Funcionário")).toBeNull();
    expect(screen.getByRole("group", { name: "Tipo" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Estado" })).toBeNull();
  });

  it("chips de estado e tipo combinam (AND entre grupos, OR dentro) e a contagem segue o mes", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByRole("status").textContent).toBe("2 de 2 pedidos neste mês");
    fireEvent.click(screen.getByRole("button", { name: "Pendente" }));
    expect(screen.getByRole("status").textContent).toBe("1 de 2 pedidos neste mês");
    expect(screen.getByRole("button", { name: "Pendente" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryAllByTitle(/\(aprovado\)/).length).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Aprovado" }));
    expect(screen.getByRole("status").textContent).toBe("2 de 2 pedidos neste mês");
    fireEvent.click(screen.getByRole("button", { name: "Licença" }));
    expect(screen.getByRole("status").textContent).toBe("0 de 2 pedidos neste mês");
  });

  it("sem recusado no grupo Estado e sem painel quando o mes esta vazio", () => {
    const { rerender } = render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.queryByRole("button", { name: "Recusado" })).toBeNull();
    rerender(<Agenda pedidos={[]} admin hoje="2026-12-01" />);
    expect(screen.queryByRole("group", { name: "Tipo" })).toBeNull();
    expect(screen.getByText("Sem pedidos neste mês.")).toBeTruthy();
  });

  it("clicar no dia abre a lista com aviso de sobreposicao e Escape fecha devolvendo o foco", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    const dia = screen.getByRole("button", { name: /^1\s*de Dezembro\s*\(hoje\)$/ });
    dia.focus();
    fireEvent.click(dia);
    const painel = screen.getByRole("region", { name: "Pedidos de 2026-12-01" });
    expect(painel.textContent).toContain("Sobreposição: mais de uma pessoa fora neste dia.");
    expect(painel.textContent).toContain("Ana · Férias · Aprovado");
    expect(painel.textContent).toContain("Rui · Férias · Pendente");
    expect(document.activeElement).toBe(painel);
    fireEvent.keyDown(painel, { key: "Escape" });
    expect(screen.queryByRole("region", { name: /Pedidos de 2026/ })).toBeNull();
    expect(document.activeElement).toBe(dia);
  });

  it("clicar num pedido aprovado ou pendente mostra o detalhe sem abrir a lista do dia", () => {
    const ana = p({ observacao: "Praia", decidido_em: "2026-11-20T10:00:00Z" });
    render(<Agenda pedidos={[ana, pedidos[1]]} admin hoje="2026-12-01" />);
    fireEvent.click(screen.getAllByTitle(/Ana: .*\(aprovado\)/)[0]);
    const painel = screen.getByRole("region", { name: "Pedido de Ana" });
    expect(painel.textContent).toContain("Sem subtipo");
    expect(painel.textContent).toContain("2026-11-27 a 2026-12-03");
    expect(painel.textContent).toContain("Dias7");
    expect(painel.textContent).toContain("Praia");
    expect(painel.textContent).toContain("2026-11-20");
    expect(screen.queryByRole("region", { name: /^Pedidos de 2026/ })).toBeNull();
    fireEvent.click(screen.getByText("Fechar"));
    fireEvent.click(screen.getAllByTitle(/Rui: .*\(pendente\)/)[0]);
    const pend = screen.getByRole("region", { name: "Pedido de Rui" });
    expect(pend.textContent).toContain("Pendente");
    expect(pend.textContent).toContain("Sem observação");
    expect(pend.textContent).toContain("Ainda não decidido");
    fireEvent.click(screen.getByText("Voltar ao dia"));
    expect(screen.getByRole("region", { name: /^Pedidos de 2026-/ })).toBeTruthy();
  });

  const colega: PedidoAgenda = {
    id: 20,
    user: { id: 2, nome: "Rui" },
    tipo: "ausencia",
    data_inicio: "2026-12-01",
    data_fim: "2026-12-02",
    estado: "aprovado",
  };

  it("detalhe de pedido de colega mostra so os campos reduzidos", () => {
    render(<Agenda pedidos={[colega]} admin={false} hoje="2026-12-01" />);
    fireEvent.click(screen.getAllByTitle(/Rui: .*\(aprovado\)/)[0]);
    const painel = screen.getByRole("region", { name: "Pedido de Rui" });
    expect(painel.textContent).toContain("Rui");
    expect(painel.textContent).toContain("Ausência");
    expect(painel.textContent).toContain("2026-12-01 a 2026-12-02");
    expect(painel.textContent).toContain("Dias2");
    expect(painel.textContent).toContain("Aprovado");
    expect(painel.textContent).not.toContain("Subtipo");
    expect(painel.textContent).not.toContain("Sem subtipo");
    expect(painel.textContent).not.toContain("Observação");
    expect(painel.textContent).not.toContain("Sem observação");
    expect(painel.textContent).not.toContain("Decidido em");
  });

  it("sobreposicao da equipa conta pedido proprio e de colega sem user_id", () => {
    const meu = p({ id: 21, user_id: 1, user: { id: 1, nome: "Ana" }, data_inicio: "2026-12-01", data_fim: "2026-12-01" });
    render(<Agenda pedidos={[meu, colega]} admin={false} hoje="2026-12-01" />);
    expect(screen.getAllByText("Sobreposição").length).toBe(1);
  });

  it("filtro de funcionario lista colegas pelo user.id", () => {
    render(<Agenda pedidos={[colega]} admin hoje="2026-12-01" />);
    fireEvent.change(screen.getByLabelText("Funcionário"), { target: { value: "2" } });
    expect(screen.getAllByTitle(/Rui:/).length).toBe(2);
  });
});
