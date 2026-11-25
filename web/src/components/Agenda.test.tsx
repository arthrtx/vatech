import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Agenda from "./Agenda";
import type { Pedido, PedidoAgenda } from "@/lib/api";

afterEach(cleanup);

const escolher = (campo: string, opcao: string) => {
  fireEvent.click(screen.getByRole("combobox", { name: campo }));
  fireEvent.click(screen.getByRole("option", { name: opcao }));
};


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
    expect(screen.getByText("Sobreposição: mais de uma pessoa fora neste dia.")).toBeTruthy();
    expect(screen.queryByText(/Ana · Licença/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Mês anterior"));
    expect(screen.getByText("Novembro 2026")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Mês anterior"));
    expect(screen.getByText("Outubro 2026")).toBeTruthy();
    expect(screen.queryByText(/Sobreposição: mais de uma pessoa/)).toBeNull();
  });

  it("setas da semana andam sete dias e acompanham o mês", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    expect(screen.getByRole("region", { name: "Pedidos de 2026-12-01" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Semana anterior"));
    expect(screen.getByRole("region", { name: "Pedidos de 2026-11-24" })).toBeTruthy();
    expect(screen.getByText("Novembro 2026")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Semana seguinte"));
    expect(screen.getByRole("region", { name: "Pedidos de 2026-12-01" })).toBeTruthy();
  });

  it("filtros alteram a lista e a sobreposicao persiste ao filtrar", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    const aviso = "Sobreposição: mais de uma pessoa fora neste dia.";
    expect(screen.getByRole("status").textContent).toBe("2 de 2 pedidos neste mês");
    escolher("Funcionário", "Rui");
    expect(screen.getByRole("status").textContent).toBe("1 de 2 pedidos neste mês");
    expect(screen.getByText(aviso)).toBeTruthy();
    escolher("Funcionário", "Todos");
    fireEvent.click(screen.getByRole("button", { name: "Licença" }));
    expect(screen.getByRole("status").textContent).toBe("0 de 2 pedidos neste mês");
    expect(screen.getByText(aviso)).toBeTruthy();
    expect(screen.getByText("Sem resultados com estes filtros.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByRole("status").textContent).toBe("2 de 2 pedidos neste mês");
  });

  it("destaca hoje na semana e distingue pendente por texto e estilo", () => {
    render(<Agenda pedidos={pedidos} admin hoje="2026-12-01" />);
    const hoje = screen.getByRole("button", { name: /\(hoje\)/ });
    expect(hoje.getAttribute("aria-pressed")).toBe("true");
    // Pendente: pílula tracejada, distinta do aprovado.
    const pilula = screen.getByText("Pendente", { selector: "span" });
    expect(pilula.className).toContain("border-dashed");
    expect(pilula.className).not.toContain("bg-positivo");
    expect(screen.getAllByRole("button").filter((b) => /-feira|^Sábado|^Domingo/.test(b.getAttribute("aria-label") ?? "")).length).toBe(7);
  });

  it("filtro de funcionario ignora quem so tem recusados", () => {
    const so = [...pedidos, p({ id: 9, user_id: 3, user: { id: 3, nome: "Zé" }, estado: "recusado" })];
    render(<Agenda pedidos={so} admin hoje="2026-12-01" />);
    fireEvent.click(screen.getByRole("combobox", { name: "Funcionário" }));
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
    const dia = screen.getByRole("button", { name: /\(hoje\)/ });
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
    fireEvent.click(screen.getAllByRole("button", { name: /^Ana · Férias/ })[0]);
    const painel = screen.getByRole("region", { name: "Pedido de Ana" });
    expect(painel.textContent).toContain("Sem subtipo");
    expect(painel.textContent).toContain("2026-11-27 a 2026-12-03");
    expect(painel.textContent).toContain("Dias7");
    expect(painel.textContent).toContain("Praia");
    expect(painel.textContent).toContain("2026-11-20");
    expect(screen.queryByRole("region", { name: /^Pedidos de 2026/ })).toBeNull();
    fireEvent.click(screen.getByText("Fechar"));
    fireEvent.click(screen.getByLabelText("Mês seguinte"));
    fireEvent.click(screen.getAllByRole("button", { name: /^Rui · Férias/ })[0]);
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
    fireEvent.click(screen.getAllByRole("button", { name: /^Rui ·/ })[0]);
    const painel = screen.getByRole("region", { name: "Pedido de Rui" });
    expect(painel.textContent).toContain("Rui");
    expect(painel.textContent).toContain("Ausência");
    expect(painel.textContent).toContain("2026-12-01 a 2026-12-02");
    expect(painel.textContent).toContain("Dias2");
    expect(painel.textContent).toContain("Aprovado");
    expect(painel.textContent).not.toContain("Subtipo");
    expect(painel.textContent).not.toContain("Sem subtipo");
    expect(painel.textContent).not.toContain("Descrição");
    expect(painel.textContent).not.toContain("Sem observação");
    expect(painel.textContent).not.toContain("Decidido em");
  });

  it("sobreposicao da equipa conta pedido proprio e de colega sem user_id", () => {
    const meu = p({ id: 21, user_id: 1, user: { id: 1, nome: "Ana" }, data_inicio: "2026-12-01", data_fim: "2026-12-01" });
    render(<Agenda pedidos={[meu, colega]} admin={false} hoje="2026-12-01" />);
    expect(screen.getByText("Sobreposição: mais de uma pessoa fora neste dia.")).toBeTruthy();
  });

  it("mostra o período de estágio, presenças no painel do dia e +N quando há mais de 3 pedidos", () => {
    const muitos = [1, 2, 3, 4].map((i) => p({ id: 100 + i, user_id: i, user: { id: i, nome: `P${i}` }, data_inicio: "2026-12-01", data_fim: "2026-12-01" }));
    const pres = { id: 1, user_id: 5, user: { id: 5, nome: "Eva" }, data: "2026-12-01", entrada: "2026-12-01T09:00:00Z", saida: null, atrasada: false };
    render(
      <Agenda
        pedidos={muitos}
        admin
        hoje="2026-12-01"
        presencas={[pres]}
        estagios={[{ id: 5, nome: "Eva", inicio: "2026-09-01", fim: "2027-02-28" }]}
      />,
    );
    expect(screen.getByText("01/09/2026 a 28/02/2027")).toBeTruthy();
    const painel = screen.getByRole("region", { name: "Pedidos de 2026-12-01" });
    expect(painel.textContent).toContain("Presenças neste dia");
    expect(painel.textContent).toContain("sem saída marcada");
    expect(painel.textContent).toContain("Estágio · Eva");
    expect(painel.textContent).not.toContain("Atrasada");
  });

  it("mostra a etiqueta Atrasada na presença do painel do dia", () => {
    const pedido = p({ id: 201, user_id: 1, user: { id: 1, nome: "Ana" }, data_inicio: "2026-12-01", data_fim: "2026-12-01" });
    const pres = { id: 2, user_id: 5, user: { id: 5, nome: "Eva" }, data: "2026-12-01", entrada: "2026-12-01T09:00:00Z", saida: null, atrasada: true };
    render(<Agenda pedidos={[pedido]} admin hoje="2026-12-01" presencas={[pres]} />);
    expect(screen.getByText("Atrasada")).toBeTruthy();
  });

  it("filtro de funcionario lista colegas pelo user.id", () => {
    const ana = p({ id: 30, user_id: 1, user: { id: 1, nome: "Ana" }, data_inicio: "2026-12-01", data_fim: "2026-12-01" });
    render(<Agenda pedidos={[colega, ana]} admin hoje="2026-12-01" />);
    expect(screen.getByRole("status").textContent).toBe("2 de 2 pedidos neste mês");
    escolher("Funcionário", "Rui");
    expect(screen.getByRole("status").textContent).toBe("1 de 2 pedidos neste mês");
  });

  describe("agenda do dia (compromissos)", () => {
    const comp = [
      { id: 1, data: "2026-12-01", hora_inicio: "10:00", hora_fim: "11:00", titulo: "Reunião com o cliente", tipo: "reuniao" as const, descricao: "Sala 2" },
      { id: 2, data: "2026-12-03", hora_inicio: null, hora_fim: null, titulo: "Entregar relatório", tipo: "lembrete" as const, descricao: null },
    ];

    it("mostra os compromissos do dia aberto e a contagem na semana", () => {
      render(<Agenda pedidos={[]} admin={false} hoje="2026-12-01" compromissos={comp} />);
      const painel = screen.getByRole("region", { name: "Pedidos de 2026-12-01" });
      expect(painel.textContent).toContain("Reunião com o cliente");
      expect(painel.textContent).toContain("Reunião · 10:00 às 11:00");
      expect(painel.textContent).toContain("Sala 2");
      expect(painel.textContent).not.toContain("Entregar relatório");
      expect(screen.getAllByText("1 na agenda").length).toBe(2);
    });

    it("dia sem hora conta como o dia todo", () => {
      render(<Agenda pedidos={[]} admin={false} hoje="2026-12-03" compromissos={comp} />);
      expect(screen.getByText("Lembrete · o dia todo")).toBeTruthy();
    });

    it("só deixa marcar a partir de hoje", () => {
      render(<Agenda pedidos={[]} admin={false} hoje="2026-12-01" compromissos={comp} />);
      expect(screen.getByRole("button", { name: "Marcar na agenda" })).toBeTruthy();
      fireEvent.click(screen.getByLabelText("Semana anterior")); // 24 de novembro, já passou
      expect(screen.queryByRole("button", { name: "Marcar na agenda" })).toBeNull();
      expect(screen.getByText("Nada na agenda neste dia.")).toBeTruthy();
      fireEvent.click(screen.getByLabelText("Semana seguinte"));
      fireEvent.click(screen.getByRole("button", { name: "Marcar na agenda" }));
      expect(screen.getByRole("dialog", { name: "Marcar na agenda" })).toBeTruthy();
    });
  });
});
