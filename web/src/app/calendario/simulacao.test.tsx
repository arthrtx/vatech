import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const agenda = vi.fn();
const criarPedido = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/EscolhaLocalidade", () => ({ default: () => null }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: 1, nome: "Ana", papel: "funcionario", empresa_id: 1 } }) }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { agenda: (...a: unknown[]) => agenda(...a), aniversarios: async () => [], pontes: async () => [], estagios: async () => [], criarPedido: (...a: unknown[]) => criarPedido(...a) },
}));

import CalendarioPage from "./page";

afterEach(() => {
  cleanup();
  agenda.mockReset();
  criarPedido.mockReset();
});

const LIMITE = 30_000;
const url = (o: Record<string, string> = {}) =>
  new URLSearchParams({ simular: "10", de: "2027-08-03", ate: "2027-08-05", tipo: "ferias", user: "1", ...o });
const ana = { id: 10, user_id: 1, user: { id: 1, nome: "Ana" }, tipo: "ferias", data_inicio: "2027-08-03", data_fim: "2027-08-05", estado: "pendente" };

describe("simulação no calendário", () => {
  it("abre no ano do pedido, com resumo, dias úteis e conflitos dia a dia", async () => {
    params = url();
    agenda.mockResolvedValue([
      ana,
      { id: 11, user: { id: 2, nome: "Rui" }, tipo: "ferias", data_inicio: "2027-08-04", data_fim: "2027-08-04", estado: "aprovado" },
      { id: 12, user: { id: 3, nome: "Eva" }, tipo: "ausencia", data_inicio: "2027-08-05", data_fim: "2027-08-05", estado: "pendente" },
    ]);
    render(<CalendarioPage />);
    await waitFor(() => expect(agenda).toHaveBeenCalledWith("2027-01-01", "2027-12-31"));
    const painel = await screen.findByRole("region", { name: "Simulação" });
    expect(painel.textContent).toContain("Ana");
    expect(painel.textContent).toContain("Férias · 03/08/2027 a 05/08/2027 · 3 dias úteis");
    expect(within(painel).getByText("Sobreposição com 2 pessoas")).toBeTruthy();
    expect(painel.textContent).toContain("Rui, férias, aprovado");
    expect(painel.textContent).toContain("Eva, ausência, pendente");
    expect(screen.getByRole("table", { name: "Calendário 2027" })).toBeTruthy();
    expect(screen.getAllByText(/^Simulação, /).length).toBe(3);
  }, LIMITE);

  it("diz Sem conflitos quando mais ninguém está fora", async () => {
    params = url();
    agenda.mockResolvedValue([ana]);
    render(<CalendarioPage />);
    expect(await screen.findByText("Sem conflitos")).toBeTruthy();
  }, LIMITE);

  it("Sair da simulação liga a /calendario e nada é escrito", async () => {
    params = url();
    agenda.mockResolvedValue([ana]);
    render(<CalendarioPage />);
    const sair = await screen.findByRole("link", { name: "Sair da simulação" });
    expect(sair.getAttribute("href")).toBe("/calendario");
    expect(criarPedido).not.toHaveBeenCalled();
  }, LIMITE);

  it("parâmetros inválidos ou ausentes: sem simulação", async () => {
    params = url({ de: "lixo" });
    agenda.mockResolvedValue([]);
    render(<CalendarioPage />);
    await screen.findByRole("table", { name: /Calendário/ });
    expect(screen.queryByRole("region", { name: "Simulação" })).toBeNull();
  }, LIMITE);

  const rui = (de: string, ate = de, extra = {}) => ({ id: 11, user: { id: 2, nome: "Rui" }, tipo: "ferias", data_inicio: de, data_fim: ate, estado: "aprovado", ...extra });
  const abrir = async (lista: unknown[]) => {
    params = url();
    agenda.mockResolvedValue(lista);
    render(<CalendarioPage />);
    return screen.findByRole("region", { name: "Simulação" });
  };
  const escreve = (id: string, valor: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value: valor } });

  it("recalcula veredicto, dias úteis e dia a dia ao mudar as datas, e repõe as do pedido", async () => {
    const painel = await abrir([ana, rui("2027-08-06")]);
    expect(within(painel).getByText("Sem conflitos")).toBeTruthy();
    expect(painel.textContent).toContain("3 dias úteis");
    expect((within(painel).getByRole("button", { name: "Repor datas do pedido" }) as HTMLButtonElement).disabled).toBe(true);

    escreve("sim-ate", "06/08/2027");
    expect(within(painel).getByText("Sobreposição com 1 pessoa")).toBeTruthy();
    expect(painel.textContent).toContain("03/08/2027 a 06/08/2027 · 4 dias úteis");
    expect(screen.getAllByText(/^Simulação, /).length).toBe(4);

    escreve("sim-de", "10/08/2027"); // início depois do fim: o fim acompanha
    expect(painel.textContent).toContain("10/08/2027 a 10/08/2027 · 1 dia útil");

    fireEvent.click(within(painel).getByRole("button", { name: "Repor datas do pedido" }));
    expect(painel.textContent).toContain("03/08/2027 a 05/08/2027 · 3 dias úteis");
    expect(within(painel).getByText("Sem conflitos")).toBeTruthy();
  }, LIMITE);

  it("camadas: desligar os pedidos aprovados tira o conflito; pontes e aniversários só filtram o dia a dia", async () => {
    const painel = await abrir([ana, rui("2027-08-04"), rui("2027-08-05", "2027-08-05", { id: 12, user: { id: 3, nome: "Eva" }, estado: "pendente" })]);
    expect(within(painel).getByText("Sobreposição com 2 pessoas")).toBeTruthy();
    const aprovados = within(painel).getByRole("button", { name: "Pedidos aprovados" });
    expect(aprovados.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(aprovados);
    expect(aprovados.getAttribute("aria-pressed")).toBe("false");
    expect(within(painel).getByText("Sobreposição com 1 pessoa")).toBeTruthy();
    expect(painel.textContent).not.toContain("Rui, férias");
    fireEvent.click(within(painel).getByRole("button", { name: "Pedidos pendentes" }));
    expect(within(painel).getByText("Sem conflitos")).toBeTruthy();
  }, LIMITE);

  it("clicar num dia da linha do tempo mostra o detalhe; Esc limpa o destaque", async () => {
    const painel = await abrir([ana, rui("2027-08-04")]);
    const lista = within(painel).getByRole("list", { name: "Dia a dia" });
    fireEvent.click(within(lista).getByRole("button", { name: /Quarta-feira, 4 de agosto/ }));
    const detalhe = within(painel).getByRole("group", { name: /Quarta-feira, 4 de agosto/ });
    expect(detalhe.textContent).toContain("Dentro da simulação.");
    expect(detalhe.textContent).toContain("1 pessoa ausente.");
    expect(within(detalhe).getByText("Rui")).toBeTruthy();
    fireEvent.keyDown(painel, { key: "Escape" });
    expect(within(painel).queryByRole("group", { name: /Quarta-feira/ })).toBeNull();
  }, LIMITE);

  it("clicar num dia do calendário abre o detalhe no painel, mesmo fora da simulação", async () => {
    const painel = await abrir([ana, rui("2027-08-09")]);
    const tabela = screen.getByRole("table", { name: "Calendário 2027" });
    fireEvent.click(within(tabela).getAllByRole("button", { name: /^Segunda-feira, 9 de agosto/ })[0]);
    const detalhe = within(painel).getByRole("group", { name: /Segunda-feira, 9 de agosto/ });
    expect(detalhe.textContent).toContain("Fora da simulação.");
    expect(within(detalhe).getByText("Rui")).toBeTruthy();
  }, LIMITE);

  it("teclado: roving tabindex e teclas de seta mudam o foco entre dias", async () => {
    const painel = await abrir([ana]);
    const botoes = within(within(painel).getByRole("list", { name: "Dia a dia" })).getAllByRole("button");
    expect(botoes.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    botoes[0].focus();
    fireEvent.keyDown(botoes[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(botoes[1]);
    fireEvent.keyDown(botoes[1], { key: "End" });
    expect(document.activeElement).toBe(botoes[2]);
    fireEvent.keyDown(botoes[2], { key: "ArrowUp" });
    expect(document.activeElement).toBe(botoes[1]);
  }, LIMITE);

  it("só lê: ajustar datas, camadas e destaques nunca escreve", async () => {
    const fetchEspia = vi.spyOn(globalThis, "fetch");
    const painel = await abrir([ana, rui("2027-08-06")]);
    escreve("sim-ate", "06/08/2027");
    fireEvent.click(within(painel).getByRole("button", { name: "Pontes" }));
    fireEvent.click(within(painel).getByRole("button", { name: "Repor datas do pedido" }));
    expect(criarPedido).not.toHaveBeenCalled();
    expect(fetchEspia).not.toHaveBeenCalled();
    fetchEspia.mockRestore();
  }, LIMITE);
});
